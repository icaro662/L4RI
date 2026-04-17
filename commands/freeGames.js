import axios from "axios";
import { clients } from "../bot.js";

const CHANNEL_ID = "1484334210085946326";

let lastFreeGames = [];

let redditCache = [];
let lastRedditFetch = 0;

let combinedCache = [];

function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function safeFetch(fn, label) {
  try {
    return await fn();
  } catch (err) {
    console.error(`${label} failed:`, err.message);
    return [];
  }
}

async function getRedditFreeGames() {
  if (Date.now() - lastRedditFetch < 5 * 60 * 1000) {
    return redditCache;
  }

  try {
    const res = await axios.get("https://api.reddit.com/r/GameDeals/new", {
      params: { limit: 25 },
      headers: {
        "User-Agent": "fluxer-bot/1.0 (by u/misha)",
      },
    });

    if (!res.data?.data?.children) {
      console.warn("Reddit blocked or invalid response");
      return redditCache;
    }

    const result = res.data.data.children
      .map((p) => p.data)
      .filter((post) => {
        const title = post.title;

        const isFree = /free|100%|\$0|0\.00/i.test(title);
        const notJunk = !/trial|beta|demo|weekend/i.test(title);
        const isStore = /steam|epic|gog/i.test(title);

        return isFree && notJunk && isStore;
      })
      .map((post) => ({
        id: "reddit_" + post.id,
        name: post.title,
        url: post.url,
        source: "reddit",
      }))
      .filter((g) => g.url && g.name);

    redditCache = result;
    lastRedditFetch = Date.now();

    return result;
  } catch (err) {
    console.error("Reddit error:", err.response?.status);
    return redditCache;
  }
}

async function getITADFreeGames() {
  try {
    const res = await axios.get("https://api.isthereanydeal.com/deals/v2", {
      params: {
        key: clients.itadKey,
        country: "BR",
      },
    });

    const deals = res.data?.list || [];

    console.log("ITAD RAW:", deals.length);

    return deals
      .filter((deal) => deal.price_new === 0)
      .map((deal) => ({
        id: "itad_" + deal.id,
        name: deal.title,
        url: deal.deal?.url || null,
        source: "itad",
      }))
      .filter((g) => g.url && g.name);
  } catch (err) {
    console.error("ITAD error:", err.response?.status);
    return [];
  }
}

async function getAllFreeGames() {
  const [itad, reddit] = await Promise.all([
    safeFetch(getITADFreeGames, "ITAD"),
    safeFetch(getRedditFreeGames, "Reddit"),
  ]);

  console.log("Sources:", {
    itad: itad.length,
    reddit: reddit.length,
  });

  const combined = [...itad, ...reddit];

  const unique = Object.values(
    Object.fromEntries(
      combined.filter((g) => g?.name).map((g) => [normalizeName(g.name), g]),
    ),
  );

  if (unique.length === 0 && combinedCache.length > 0) {
    console.warn("Using cached results");
    return combinedCache;
  }

  if (unique.length > 0) {
    combinedCache = unique;
  }

  return unique;
}

async function checkFreeGames(api) {
  try {
    const current = await getAllFreeGames();

    const isFirstRun = lastFreeGames.length === 0;

    const newGames = isFirstRun
      ? current
      : current.filter((g) => !lastFreeGames.some((p) => p.id === g.id));

    if (newGames.length > 0) {
      const description = newGames
        .slice(0, 5)
        .map((g) => `[${g.name}](${g.url})`)
        .join("\n\n");

      await api.channels.createMessage(CHANNEL_ID, {
        embeds: [
          {
            title: isFirstRun ? "Current Promotions" : "New Promotions Found!",
            description,
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } else {
      await api.channels.createMessage(CHANNEL_ID, {
        embeds: [
          {
            title: "Checked for Promotions",
            description: "No new free games found.",
            color: 0xffff00,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }

    lastFreeGames = current;

    return newGames;
  } catch (err) {
    console.error("checkFreeGames error:", err);
    return [];
  }
}

export async function handleFreeGames(api) {
  const newGames = await checkFreeGames(api);

  await api.channels.createMessage(CHANNEL_ID, {
    embeds: [
      {
        title: "Checked for Promotions",
        description: `Current: ${lastFreeGames.length} free games\nNew: ${newGames.length} new free games`,
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
      },
    ],
  });
}

export function startFreeGamesChecker(api) {
  setInterval(
    () => {
      checkFreeGames(api).catch((err) => console.error("Interval error:", err));
    },
    1000 * 60 * 360,
  ); // every 6 hours
}
