import axios from "axios";
import { clients } from "../bot.js";

const CHANNEL_ID = "1484334210085946326";

let lastFreeGames = [];

let redditCache = [];
let lastRedditFetch = 0;

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
    const res = await axios.get("https://www.reddit.com/r/GameDeals/new.json?limit=25", {
      headers: {
        "User-Agent": "web:Fluxer-tool:1.0 (by /u/misha)",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive"
      },
    })
    console.log(res.config.headers);
    console.log("Reddit API response status:", res.status);
    
    if (!res.data?.data?.children) {
      console.warn("Reddit blocked or invalid response");
      return redditCache;
    }

    const result = res.data.data.children
      .map((p) => p.data)
      .filter((post) => {
        const title = post.title;

        const isFree = /free|100%|\$0|0\.00/i.test(title);
        const notJunk = !/trial|beta|demo|weekend|99%|0\.001/i.test(title);
        const isStore = /steam|epic|gog/i.test(title);
        const isService = /[Steam|Epic|GOG]/i.test(title);
        const notExpired = !/expired|ended|over/i.test(title);

        return isFree && notJunk && isStore && isService && notExpired;
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

    console.log("Reddit fetched posts:", redditCache);

    return result;
  } catch (err) {
    console.error("Reddit error:", err.response?.status);
    return redditCache;
  }
}

async function checkFreeGames(api) {
  try {
    const current = await getRedditFreeGames();

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

    console.log(`Checked for free games. Found ${current.length} total, ${newGames.length} new.`);
    return newGames;
  } catch (err) {
    console.error("checkFreeGames error:", err);
    return [];
  }
}

export async function handleFreeGames(api) {
  await checkFreeGames(api);
}

export function startFreeGamesChecker(api) {
  setInterval(
    () => {
      checkFreeGames(api).catch((err) => console.error("Interval error:", err));
    },
    1000 * 60 * 360,
  ); // every 6 hours
}
