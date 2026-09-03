import axios from "axios";
import { client } from "../index.js";
import { error, log } from '../utils/logger.js';

const CHANNEL_ID = process.env.TARGET_GAMESNOT_CHANNEL_ID;

let lastFreeGames = [];
let itadCache = [];
let lastFetch = 0;

export async function fetchFreeGames() {
  if (Date.now() - lastFetch < 12 * 60 * 60 * 1000) {
    log('FreeGames', 'Using cached games, count:', itadCache.length);
    return itadCache;
  }

  try {
    const res = await axios.get('https://api.isthereanydeal.com/deals/v2', {
      params: {
        key: process.env.ITAD_API_KEY,
        country: 'BR',
        limit: 50,
        sort: '-cut',
      }
    });

    log('FreeGames', 'ITAD fetch status:', res.status);

    if (!res.data?.list) {
      console.warn("[L4RI] Invalid ITAD response");
      return itadCache;
    }

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

    itadCache = games;
    lastFetch = Date.now();

    return itadCache;
  } catch (err) {
    error('FreeGames', 'ITAD error:', err.response?.status, err.response?.data);
    return itadCache;
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
  const channel = client.channels.get(CHANNEL_ID);

  if (!channel) {
    error('FreeGames', 'Channel not found:', CHANNEL_ID);
    return;
  }

  const freeGames = await fetchFreeGames();
  const isFirstRun = lastFreeGames.length === 0;

  const seen = new Set();
  const unique = freeGames.filter((g) => {
    const idKey = g.id;
    const titleKey = normalizeTitle(g.name);

    if (seen.has(idKey) || seen.has(titleKey)) return false;

    seen.add(idKey);
    seen.add(titleKey);
    return true;
  });

  // on subsequent runs, only notify about new games
  const toNotify = isFirstRun
    ? unique
    : unique.filter((g) => !lastFreeGames.some((prev) => prev.id === g.id));

  log('FreeGames', 'Games to notify:', toNotify.length);

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

  lastFreeGames = unique;
  return unique;
}

export async function handleFreeCheck(message) {
  await compareCache();
}

export async function gamesFetchInterval() {
  if (itadCache.length === 0) {
    await fetchFreeGames();
  }

  setInterval(async () => {
    compareCache().catch((err) => error('FreeGames', 'Interval error:', err));
  }, 1000 * 60 * 60 * 12);
}