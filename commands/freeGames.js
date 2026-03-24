import axios from 'axios';

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
        "User-Agent": "discord-bot"
      }
    }
  );

  const posts = res.data.data.children;

  return posts
    .map(p => p.data)
    .filter(post => {
      const title = post.title.toLowerCase();

      return (
        (title.includes("free") ||
        title.includes("100%") ||
        title.includes("100% off") &&
        !title.includes("weekend") &&
        !title.includes("free trial")) &&
        (title.includes("steam") || title.includes("epic") || title.includes("gog"))
      );
    })
    .map(post => ({
      id: "reddit_" + post.id,
      name: post.title,
      url: post.url
    }));
}

async function getITADFreeGames() {
  try {
    const res = await axios.get("https://api.isthereanydeal.com/deals/v2", {
      params: {
        key: clients.itadKey,
        country: "BR"
      }
    });

    return res.data.list
      .filter(game => {
        const price = game.deal?.price?.amount ?? 999;
        const cut = game.deal?.cut ?? 0;

        return price === 0 || cut === 100;
      })
      .map(game => ({
        id: game.id,
        name: game.title,
        url: game.deal?.url 
      }));

  } catch (err) {
    console.error("ITAD error:", err.response?.data || err.message);
    return []; 
  }
}

async function getAllFreeGames() {
  const [itad, reddit] = await Promise.all([
    safeFetch(getITADFreeGames),
    safeFetch(getRedditFreeGames)
  ]);

  const combined = [...itad, ...reddit];

  const unique = Object.values(
    Object.fromEntries(
      combined.map(g => [g.name.toLowerCase(), g])
    )
  );

  return unique;
}

async function checkFreeGames(api) {
  try {
    const current = await getAllFreeGames();

    if (lastFreeGames.length === 0) {
      lastFreeGames = current;
      return;
    }

    const newGames = current.filter(
      g => !lastFreeGames.some(p => p.id === g.id)
    );

    if (newGames.length > 0) {
      const description = newGames.slice(0, 5).map(game =>
        `[${game.name}](${game.url})\n`
      ).join("\n\n");

      await api.channels.createMessage(CHANNEL_ID, {
        embeds: [
          {
            title: "**New Free Steam Games!**",
            description,
            color: 0x00ff00,
            timestamp: new Date().toISOString()
          }
        ]
      });
    }

    lastFreeGames = current;
  } catch (err) {
    console.error("checkFreeGames error:", err);
  }
}

export async function handleFreeGames(api, data, args, clients) {
  await checkFreeGames(api);
}

export function startFreeGamesChecker(api) {
  setInterval(async () => {
    try {
      await checkFreeGames(api);
    } catch (err) {
      console.error("Interval error:", err);
    }
  }, 1000 * 60 * 720); 
}