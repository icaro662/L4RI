import axios from "axios";
import { client} from "../index.js";
import { error, log } from "../utils/logger.js";

const CHANNEL_ID = process.env.TARGET_GAMESNOT_CHANNEL_ID;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const today = new Date();
let schedule = new Date()

schedule.setTime(today.getTime() + TWELVE_HOURS_MS);

let lastFreeGames = [];
let itadCache = [];
let lastFetch = 0;
let isFetching = false;

/**
 * Fetches 100% discounted game deals from ITAD API with strict 12-hour TTL.
 */
export async function fetchFreeGames(forceRefresh = false) {
  const now = Date.now();

  // Step 1: Cache Check (Skip if fetched within 12 hours and not forced)
  if (!forceRefresh && now - lastFetch < TWELVE_HOURS_MS) {
    log("FreeGames", "Using cached games, count:", itadCache.length);
    return itadCache;
  }

  // Prevent duplicate concurrent network requests
  if (isFetching) {
    log("FreeGames", "Fetch already in progress, returning current cache.");
    return itadCache;
  }

  isFetching = true;

  try {
    // Step 2: Request latest game deals from ITAD API
    const res = await axios.get("https://api.isthereanydeal.com/deals/v2", {
      params: {
        key: process.env.ITAD_API_KEY,
        country: "BR",
        limit: 50,
        sort: "-cut",
      },
      timeout: 10000, // 10s timeout to prevent hanging intervals
    });

    log("FreeGames", "ITAD fetch status:", res.status);

    if (!res.data?.list) {
      console.warn("[L4RI] Invalid ITAD response structure");
      lastFetch = now;
      return itadCache;
    }

    // Step 3: Filter 100% off deals for Steam and Epic Games Store
    const games = res.data.list
      .filter((game) => game.deal?.cut === 100)
      .filter((game) =>
        ["Steam", "Epic Game Store"].includes(game.deal?.shop?.name),
      )
      .map((game) => ({
        id: game.id,
        name: game.title,
        url: game.deal.url,
        shop: game.deal.shop.name,
        expiry: game.deal.expiry,
      }));

    log("FreeGames", "Free games fetched:", games.length);

    // Step 4: Update in-memory cache and timestamp on success
    itadCache = games;
    lastFetch = now;
    return itadCache;
  } catch (err) {
    error("FreeGames", "ITAD error:", err.response?.status, err.message);
    // CRITICAL FIX: Set lastFetch on error to prevent rapid re-fetching loops.
    // Retries will wait until the next TTL window or back off for 15 minutes.
    lastFetch = now - (TWELVE_HOURS_MS - 15 * 60 * 1000);
    return itadCache;
  } finally {
    isFetching = false;
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

/**
 * Compares freshly fetched free games and posts updates to the channel.
 */
export async function compareCache(isManualTrigger = false) {
  const channel = client.channels.get(CHANNEL_ID);

  if (!channel) {
    error("FreeGames", "Channel not found:", CHANNEL_ID);
    return;
  }

  // Fetch games (respecting the 12-hour TTL cache)
  const freeGames = await fetchFreeGames(isManualTrigger);
  const isFirstRun = lastFreeGames.length === 0;

  // Deduplicate games by ID and normalized title
  const seen = new Set();
  const unique = freeGames.filter((g) => {
    const idKey = g.id;
    const titleKey = normalizeTitle(g.name);

    if (seen.has(idKey) || seen.has(titleKey)) return false;

    seen.add(idKey);
    seen.add(titleKey);
    return true;
  });

  // Determine games to notify
  const toNotify = isFirstRun
    ? unique
    : unique.filter((g) => !lastFreeGames.some((prev) => prev.id === g.id));

  log("FreeGames", "Games to notify:", toNotify.length);

  // Send notification embed
  if (toNotify.length > 0) {
    const description = toNotify
      .slice(0, 5)
      .map((g) => {
        const expiry = g.expiry
          ? `\nExpires: <t:${Math.floor(new Date(g.expiry).getTime() / 1000)}:R>`
          : "";
        return `**[${g.name}](${g.url})**\nStore: ${g.shop}${expiry}`;
      })
      .join("\n\n");

    await channel.send({
      embeds: [
        {
          title: isFirstRun ? "Current Free Games" : "New Free Games Found!",
          description,
          color: 0x00ff00,
          timestamp: new Date().toISOString(),
        },
      ],
    });
  } else if (isManualTrigger) {
    // Only send "No new free games found" if triggered manually by a user command
    await channel.send({
      embeds: [
        {
          title: "Checked for Free Games",
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
  if (message.channel.id != CHANNEL_ID) {
    return
  }
  await compareCache(true);
}

/**
 * Initializes the background scheduler to periodically check for free games every 12 hours.
 */
export async function gamesFetchInterval() {
  log("FreeGames", "Initializing 12-hour games fetch interval scheduler...");
  log("FreeGames", `Next Check: ${schedule}`);
  // Warm up cache once on startup without broadcasting unless necessary
  if (itadCache.length === 0) {
    await fetchFreeGames();
  }

  // Set up 12-hour interval check
  setInterval(async () => {
    log("FreeGames", "Running scheduled 12-hour free games check...");
    compareCache(false).catch((err) =>
      error("FreeGames", "Interval error:", err),
    );
  }, TWELVE_HOURS_MS);
}
