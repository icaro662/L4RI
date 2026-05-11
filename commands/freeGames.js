import axios from "axios";
import { clients } from "../index.js";
import { client } from "../index.js";
import { Channel } from "@fluxerjs/core";

const context = process.env.PROD;

let CHANNEL_ID;

if (context === "true") {
  CHANNEL_ID = process.env.GAMESNOT_CHANNEL_ID
} else if (context === "false") {
  CHANNEL_ID = process.env.TEST_CHANNEL_ID
}

console.log(context)
console.log("channel id:", CHANNEL_ID)

let lastFreeGames = []; // cache of last known free games to detect changes
let redditCache = []; // actual cached posts
let lastRedditFetch = 0; // timestamp of last fetch to manage caching

console.log("[L4RI] Fetching games...");

export async function fetchRedditGames() {
  if (Date.now() - lastRedditFetch < 12 * 60 * 60 * 1000) {
    return redditCache;
  }

  try {
    const [res0, res1, res2] = await Promise.all ([
    axios.get("https://www.reddit.com/r/GameDeals/top.json?limit=10", {
      headers: {
            "User-Agent": "Web:Fluxer-tool:1.0 (by /u/misha)",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive"
        },
        }),
    axios.get("https://www.reddit.com/r/GameDeals/new.json?limit=10", {
      headers: {
            "User-Agent": "Web:Fluxer-tool:1.0 (by /u/misha)",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive"
        },
        }),
    axios.get("https://www.reddit.com/r/GameDeals/best.json?limit=10", {
      headers: {
            "User-Agent": "Web:Fluxer-tool:1.0 (by /u/misha)",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive"
        },
        })
      ])
   
    console.log("[L4RI] Games fetch status code: ", res2.status);
    //console.log("[2] Fetching games response 0:", res0.data.data.children);
    //console.log("[2] Fetching games response 1:", res1.data.data.children);
    //console.log("[2] Fetching games response 2:", res2.data.data.children);
    
    if (!res0.data?.data?.children || !res1.data?.data?.children || !res2.data?.data?.children) {
      console.warn("Reddit blocked or invalid response");
      return redditCache;
    }

    const result = [
      ...res0.data.data.children, 
      ...res1.data.data.children, 
      ...res2.data.data.children
    ]

    redditCache = result;
    lastRedditFetch = Date.now();

    console.log("[L4RI] Successfully fetched games! Count:", redditCache.length);

    return redditCache;
  } catch (err) {
    console.error("r/GameDeals error:", err.response?.status);
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

    // remove hash & query completely
    url.hash = "";
    url.search = "";

    let pathname = url.pathname.replace(/\/+$/, "");

    // -------------------------
    // 🔴 STEAM (best reliability: app ID)
    // -------------------------
    if (hostname.includes("steampowered.com") || hostname === "store.steampowered.com") {
      const match = pathname.match(/\/app\/(\d+)/);
      if (match) return `steam:${match[1]}`;
    }

    // -------------------------
    // 🟣 EPIC GAMES (slug cleanup)
    // -------------------------
    if (hostname.includes("epicgames.com")) {
      const parts = pathname.split("/").filter(Boolean);

      // usually: /store/en-US/p/game-name
      const slug = parts[parts.length - 1];
      if (slug) return `epic:${slug.toLowerCase()}`;
    }

    // -------------------------
    // 🟡 GOG (slug)
    // -------------------------
    if (hostname.includes("gog.com")) {
      const parts = pathname.split("/").filter(Boolean);
      const slug = parts[parts.length - 1];
      if (slug) return `gog:${slug.toLowerCase()}`;
    }

    // -------------------------
    // 🔵 HUMBLE / OTHER STORES (basic slug fallback)
    // -------------------------
    if (hostname.includes("humblebundle.com")) {
      const parts = pathname.split("/").filter(Boolean);
      const slug = parts[parts.length - 1];
      if (slug) return `humble:${slug.toLowerCase()}`;
    }

    // -------------------------
    // 🌍 GENERIC FALLBACK
    // -------------------------
    // remove trailing slash, lowercase everything
    return `${hostname}${pathname}`.toLowerCase();

  } catch {
    return null;
  }
}


function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/free|100%|\$0|0\.00|limited time/gi, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function compareCache() {
  const channel = await client.channels.get(CHANNEL_ID);
 
  const redditGames = await fetchRedditGames();
  const freeGames = getFreeGames(redditGames);

  const isFirstRun = lastFreeGames.length === 0;

  const seen = new Set();

  const unique = freeGames.filter((g) => {
    const urlKey = g.id;
    const titleKey = normalizeTitle(g.name);

    if (seen.has(urlKey) || seen.has(titleKey)) return false;

    seen.add(urlKey);
    seen.add(titleKey);
  return true;
  });

  console.log("[L4RI] Filtered free games count:", unique.length);

  if (unique.length > 0) {
    const description = unique
      .slice(0, 5)
      .map((g) => `[${g.name}](${g.url})`)
      .join("\n\n");

    await channel.send({
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
    await channel.send({
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

  lastFreeGames = unique;

  return unique;
}


export async function handleFreeCheck(message) {
  await compareCache();
}


export async function gamesFetchInterval(client) {
  if (redditCache.length === 0) {
    await fetchRedditGames()
  }


  setInterval(async () => {
    compareCache().catch((err) => console.error("Interval error:", err));
    },
    1000 * 60 * 60 * 12); // every 12 hours
}
