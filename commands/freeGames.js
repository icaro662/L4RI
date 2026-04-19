import axios from "axios";
import { clients } from "../index.js";

const CHANNEL_ID = "1484334210085946326";

let lastFreeGames = [];

let redditCache = [];
let lastRedditFetch = 0;

export async function fetchRedditGames() {
  if (Date.now() - lastRedditFetch < 12 * 60 * 60 * 1000) {
    return redditCache;
  }

  try {
    const res = await axios.get("https://www.reddit.com/r/GameDeals/top.json?limit=25", {
      headers: {
            "User-Agent": "Web:Fluxer-tool:1.0 (by /u/misha)",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive"
        },
    })
  
    console.log("[2] Fetching games...");
    console.log("[2] Fetching games response status:", res.status);
    
    if (!res.data?.data?.children) {
      console.warn("Reddit blocked or invalid response");
      return redditCache;
    }

    const result = res.data.data.children

    redditCache = result;
    lastRedditFetch = Date.now();

    console.log("[2] Successfully fetched games! Count:", redditCache.length);

    return redditCache;
  } catch (err) {
    console.error("Reddit error:", err.response?.status);
    return redditCache;
  }
}

export function getFreeGames(result) {
return result
  .map((p) => p.data)
  .filter((post) => {
    const title = post.title;
    const flair = post.link_flair_text || "";

    const isFree = /free|100%|\$0|0\.00/i.test(title);
    const notJunk = !/trial|beta|demo|weekend|99%|0\.001/i.test(title);
    const isStore = /steam|epic|gog/i.test(title);
    const notExpired = !/expired|ended|over/i.test(flair);

    return isFree && notJunk && isStore && notExpired;
  })
  .map((post) => ({
    id: normalizeUrl(post.url),
    name: post.title,
    url: post.url,
  }))
  .filter((g) => g.url && g.name);
}

export function normalizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  try {
    const url = new URL(rawUrl);

    // normalize hostname
    let hostname = url.hostname.toLowerCase().replace(/^www\./, "");

    // remove hash
    url.hash = "";

    // strip ALL query params (simplest + most reliable)
    url.search = "";

    // clean trailing slash
    let pathname = url.pathname.replace(/\/+$/, "");

    // optional: special handling for known stores

    // Steam: keep only /app/{id}
    if (hostname.includes("steampowered.com")) {
      const match = pathname.match(/^\/app\/\d+/);
      if (match) pathname = match[0];
    }

    // Epic: remove extra slug noise
    if (hostname.includes("epicgames.com")) {
      pathname = pathname.split("/").slice(0, 3).join("/");
    }

    // GOG: keep first meaningful path
    if (hostname.includes("gog.com")) {
      pathname = pathname.split("/").slice(0, 3).join("/");
    }

    return `${hostname}${pathname}`;
  } catch {
    return null; // invalid URL
  }
}

export async function compareCache(api) {

  const redditGames = await fetchRedditGames();
  const freeGames = getFreeGames(redditGames);

  console.log("[2] Filtered free games count:", freeGames.length);

  const isFirstRun = lastFreeGames.length === 0;

  const newGames = isFirstRun
    ? freeGames
    : freeGames.filter((g) => !lastFreeGames.some((p) => p.id === g.id));

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

  lastFreeGames = freeGames;

  return newGames;
}

export async function handleFreeCheck(api) {
  await compareCache(api);
}

export function gamesFetchInterval(api) {
  setInterval(
    () => {
      getFreeGames(api).catch((err) => console.error("Interval error:", err));
    },
    1000 * 60 * 60 * 12,
  ); // every 12 hours
}
