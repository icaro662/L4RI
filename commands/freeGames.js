import axios from "axios";
import { client } from "../index.js";
import { error, log } from '../utils/logger.js';

const CHANNEL_ID = process.env.TARGET_GAMESNOT_CHANNEL_ID;

let lastFreeGames = [];
let itadCache = [];
let lastFetch = 0;

/**
 * Fetches 100% discounted game deals from the IsThereAnyDeal (ITAD) API with 12-hour in-memory caching.
 *
 * Flow:
 * 1. Cache Check: Checks if the last successful fetch occurred less than 12 hours ago. Returns `itadCache` if valid.
 * 2. API Request: Sends a GET request to ITAD `/deals/v2` with API key, country code BR, and sort `-cut`.
 * 3. Validation: Confirms `res.data.list` exists; warns and returns current cache if structure is invalid.
 * 4. Filtering & Mapping: Filters deals where discount cut is 100% and storefront is Steam or Epic Game Store, mapping relevant metadata.
 * 5. Cache Mutation: Stores parsed games in `itadCache` and updates `lastFetch` timestamp.
 * 6. Return / Fallback: Returns the cached deals array; on network/API failure, logs error and returns existing cache.
 *
 * @returns {Promise<Array<{id: string, name: string, url: string, shop: string, expiry: string|null}>>} Array of free game deal objects.
 */
export async function fetchFreeGames() {
  // Step 1: Return cached games if within 12-hour TTL.
  if (Date.now() - lastFetch < 12 * 60 * 60 * 1000) {
    log('FreeGames', 'Using cached games, count:', itadCache.length);
    return itadCache;
  }

  try {
    // Step 2: Request latest game deals from ITAD API.
    const res = await axios.get('https://api.isthereanydeal.com/deals/v2', {
      params: {
        key: process.env.ITAD_API_KEY,
        country: 'BR',
        limit: 50,
        sort: '-cut',
      }
    });

    log('FreeGames', 'ITAD fetch status:', res.status);

    // Step 3: Validate API response payload.
    if (!res.data?.list) {
      console.warn("[L4RI] Invalid ITAD response");
      return itadCache;
    }

    // Step 4: Filter 100% off deals for Steam and Epic Games Store and map fields.
    const games = res.data.list
      .filter((game) => game.deal.cut === 100)
      .filter((game) => ['Steam', 'Epic Game Store'].includes(game.deal.shop.name))
      .map((game) => ({
        id: game.id,
        name: game.title,
        url: game.deal.url,
        shop: game.deal.shop.name,
        expiry: game.deal.expiry,
      }));

    log('FreeGames', 'Free games fetched:', games.length);

    // Step 5: Update in-memory cache and timestamp.
    itadCache = games;
    lastFetch = Date.now();

    // Step 6: Return the newly cached games.
    return itadCache;
  } catch (err) {
    error('FreeGames', 'ITAD error:', err.response?.status, err.response?.data);
    return itadCache;
  }
}

/**
 * Normalizes a game title by stripping casing, giveaway keywords, special characters, and whitespace.
 *
 * Flow:
 * 1. Converts input string to lowercase.
 * 2. Removes common giveaway phrases ('free', '100%', '$0', '0.00', 'limited time').
 * 3. Removes all non-alphanumeric characters except spaces.
 * 4. Collapses multi-spaces into single spaces and trims edges.
 *
 * @param {string} title - Raw game title string.
 * @returns {string} Sanitized title string suitable for deduplication comparison.
 */
function normalizeTitle(title) {
  // Step 1: Lowercase, remove giveaway keywords, strip non-alphanumeric characters, and collapse spaces.
  return title
    .toLowerCase()
    .replace(/free|100%|\$0|0\.00|limited time/gi, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compares freshly fetched free games against previous runs and broadcasts updates to the notification channel.
 *
 * Flow:
 * 1. Channel Resolution: Looks up the target notification channel using `CHANNEL_ID`. Returns early if unavailable.
 * 2. Deal Fetch: Calls `fetchFreeGames()` and records whether this is the initial run (`lastFreeGames.length === 0`).
 * 3. Deduplication: Filters duplicate listings using a Set of deal IDs and normalized game titles.
 * 4. Delta Calculation: On initial run, marks all deals as to-notify; on subsequent runs, selects deals absent from `lastFreeGames`.
 * 5. Notification Dispatch: Formats and posts an embed with store details and relative expiry timestamps if new deals exist; otherwise sends a "no new games" embed.
 * 6. Cache Update: Synchronizes `lastFreeGames` with current unique listings and returns the list.
 *
 * @returns {Promise<Array<Object>|void>} Unique free games list, or undefined if channel was not found.
 */
export async function compareCache() {
  // Step 1: Locate target Discord/Fluxer notification channel.
  const channel = client.channels.get(CHANNEL_ID);

  if (!channel) {
    error('FreeGames', 'Channel not found:', CHANNEL_ID);
    return;
  }

  // Step 2: Fetch free games and determine if this is the initial run.
  const freeGames = await fetchFreeGames();
  const isFirstRun = lastFreeGames.length === 0;

  // Step 3: Deduplicate games by ID and normalized title.
  const seen = new Set();
  const unique = freeGames.filter((g) => {
    const idKey = g.id;
    const titleKey = normalizeTitle(g.name);

    if (seen.has(idKey) || seen.has(titleKey)) return false;

    seen.add(idKey);
    seen.add(titleKey);
    return true;
  });

  // Step 4: Determine games to notify (all for first run, newly appeared for subsequent runs).
  const toNotify = isFirstRun
    ? unique
    : unique.filter((g) => !lastFreeGames.some((prev) => prev.id === g.id));

  log('FreeGames', 'Games to notify:', toNotify.length);

  // Step 5: Send notification embed with game details or status message.
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
      embeds: [{
        title: isFirstRun ? "Current Free Games" : "New Free Games Found!",
        description,
        color: 0x00ff00,
        timestamp: new Date().toISOString(),
      }],
    });
  } else {
    await channel.send({
      embeds: [{
        title: "Checked for Free Games",
        description: "No new free games found.",
        color: 0xffff00,
        timestamp: new Date().toISOString(),
      }],
    });
  }

  // Step 6: Store updated game list and return unique games.
  lastFreeGames = unique;
  return unique;
}

/**
 * Command handler entry point for manual free games check.
 *
 * Flow:
 * 1. Delegates to `compareCache()` to evaluate free games and post channel updates.
 *
 * @param {Object} message - Fluxer message object triggering the command.
 * @returns {Promise<void>}
 */
export async function handleFreeCheck(message) {
  // Step 1: Trigger cache comparison and channel notification.
  await compareCache();
}

/**
 * Initializes the background scheduler to periodically check for free games every 12 hours.
 *
 * Flow:
 * 1. Cold Start Check: If cache is empty, immediately executes `fetchFreeGames()`.
 * 2. Polling Loop: Registers a 12-hour interval that invokes `compareCache()`, catching and logging any errors.
 *
 * @returns {Promise<void>}
 */
export async function gamesFetchInterval() {
  // Step 1: Warm up cache on startup if empty.
  if (itadCache.length === 0) {
    await fetchFreeGames();
  }

  // Step 2: Establish recurring 12-hour timer for deal checks.
  setInterval(async () => {
    compareCache().catch((err) => error('FreeGames', 'Interval error:', err));
  }, 1000 * 60 * 60 * 12);
}