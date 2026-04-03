import axios from "axios";
import { clients } from "../bot.js";

const CHANNEL_ID = "1484334210085946326";
let lastFreeGames = [];

async function safeFetch(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("Fetch failed:", err.message);
    return [];
  }
}

async function getRedditFreeGames() {
  const res = await axios.get(
    "https://www.reddit.com/r/GameDeals/new.json?limit=25",
    {
      headers: {
        "User-Agent": "fluxer-bot:l4ri:v1.0 (by /u/misha)",
      },
    },
  );

  const posts = res.data.data.children;

  return posts
    .map((p) => p.data)
    .filter((post) => {
      const title = post.title.toLowerCase();

      return (
        (title.includes("free") ||
          title.includes("100%") ||
          title.includes("100% off")) &&
        !title.includes("weekend") &&
        !title.includes("free trial") &&
        (title.includes("steam") ||
          title.includes("epic") ||
          title.includes("gog"))
      );
    })
    .map((post) => ({
      id: "reddit_" + post.id,
      name: post.title,
      url: post.url,
    }));
}

async function getITADFreeGames() {
  try {
    const res = await axios.get("https://api.isthereanydeal.com/deals/v2", {
      params: {
        key: clients.itadKey,
        country: "BR",
      },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Connection: "keep-alive",
      },
      timeout: 10000,
    });

    return res.data;
  } catch (err) {
    console.error(err.response?.status, err.response?.data);
  }
}

async function getAllFreeGames() {
  const [itad, reddit] = await Promise.all([
    safeFetch(getITADFreeGames),
    safeFetch(getRedditFreeGames),
  ]);

  const combined = [...itad, ...reddit];

  const unique = Object.values(
    Object.fromEntries(combined.map((g) => [g.name.toLowerCase(), g])),
  );

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
        .map((game) => `[${game.name}](${game.url})\n`)
        .join("\n\n");

      await api.channels.createMessage(CHANNEL_ID, {
        embeds: [
          {
            title: isFirstRun
              ? "**Current Free Games **"
              : "**New Free Games! **",
            description,
            color: 0x00ff00,
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
  console.log("Checked for free games");
  console.log(
    "Current free games:",
    lastFreeGames.map((g) => g.name).join(", "),
  );
  console.log("New free games:", lastFreeGames.length);
  console.log(newGames);
}

export function startFreeGamesChecker(api) {
  setInterval(
    async () => {
      try {
        await checkFreeGames(api);
      } catch (err) {
        console.error("Interval error:", err);
      }
    },
    1000 * 60 * 360,
  );
}
