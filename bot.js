import 'dotenv/config';
import {Client, GatewayDispatchEvents} from '@discordjs/core';
import {REST} from '@discordjs/rest';
import {WebSocketManager} from '@discordjs/ws';
import axios from 'axios';

const CHANNEL_ID = "1484334210085946326"; 
const PREFIX = '!';

const YT_API_KEY = process.env['YOUTUBE_API_KEY'];
if (!YT_API_KEY) {
  throw new Error('You forgot the YouTube API key!');
}

const token = process.env['FLUXER_BOT_TOKEN'];
if (!token) {
  throw new Error('You forgot the token!');
}

let lastFreeGames = [];

const rest = new REST({api: 'https://api.fluxer.app', version: '1'}).setToken(token);

const gateway = new WebSocketManager({
  intents: 513,
  rest,
  token,
  version: '1',
});

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
        key: process.env.ITAD_API_KEY,
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

function extractUrls(text) {
  return text.match(/https?:\/\/\S+/g) || [];
}

function getEmbedVariants(url) {
    if (url.includes("instagram.com") || url.includes("instagram/reel")) {
      return [
        url.replace("instagram.com", "ddinstagram.com"),
        url.replace("instagram.com", "ssinstagram.com"),
        url
      ]
    }

  if (url.includes("twitter.com") || url.includes("x.com")) {
    return [
      url.replace(/(twitter|x)\.com/, "fxtwitter.com"),
      url.replace(/(twitter|x)\.com/, "vxtwitter.com"),
      url
    ];
  }

  if (url.includes("reddit.com")) {
    return [
      url.replace("reddit.com", "rxddit.com"),
      url
    ];
  }

  return [url];
}

const client = new Client({rest, gateway});

client.on(GatewayDispatchEvents.MessageCreate, async ({api, data}) => {
  if (data.author.bot) {
    return;
  }

  if (!data.content.startsWith(PREFIX)) {

  const urls = extractUrls(data.content);

  if (urls.length > 0) {

    for (let url of urls) {

      if (url.includes("instagram.com") || 
          url.includes("instagram/reel") || 
          url.includes("twitter.com") || 
          url.includes("x.com") || 
          url.includes("reddit.com")) {

      const variants = getEmbedVariants(url);

      await api.channels.deleteMessage(data.channel_id, data.id);

      await api.channels.createMessage(data.channel_id, {

        content: "Message sent by " + data.author.username + "\n" + variants[0],
      });

    }
  }
    return;
  }
}

  const args = data.content.slice(PREFIX.length).trim().split(" ");
  const command = args.shift().toLowerCase();

  if (command === "yt") {
    const query = args.join(" ");
    if (!query) {
        return api.channels.createMessage(data.channel_id, {
            content: "Give me something to search!",
            message_reference: { message_id: data.id },
    });
}
  
    try {
      const res = await axios.get(
        `https://www.googleapis.com/youtube/v3/search`,
        {
          params: {
            part: "snippet",
            q: query,
            key: YT_API_KEY,
            maxResults: 1,
            type: "video"
          }
        }
      );

      const video = res.data.items[0];
      const url = `https://www.youtube.com/watch?v=${video.id.videoId}`;

      await api.channels.createMessage(data.channel_id, {
        content: `${url}`,
        message_reference: { message_id: data.id },
});
    } catch (err) {
      console.error(err);
        await api.channels.createMessage(data.channel_id, {
        content: "Error searching YouTube.",
        message_reference: { message_id: data.id },
});
}
  }

if (data.content === 'casa cmg?') {
  await api.channels.createMessage(data.channel_id, {
    content: 'SIM CASO COM VC',
    message_reference: {message_id: data.id},
  });
}

if (command === "testall") {
  const games = await getAllFreeGames();

  console.log("ALL:", games);

  if (!games.length) {
    return api.channels.createMessage(data.channel_id, {
      content: "❌ No free games found (all sources)"
    });
  }

  await api.channels.createMessage(data.channel_id, {
    content: `🔥 Found ${games.length} total deals\n\n` +
             games.slice(0, 5).map(g => g.name).join("\n")
  });
}

if (command === "testitad") {
  const games = await getITADFreeGames();

  console.log("ITAD:", games);

  if (!games.length) {
    return api.channels.createMessage(data.channel_id, {
      content: "❌ No ITAD free games found"
    });
  }

  await api.channels.createMessage(data.channel_id, {
    content: `✅ ITAD found ${games.length} games\n` +
             games.slice(0, 5).map(g => g.name).join("\n")
  });
}

if (command === "testreddit") {
  const games = await getRedditFreeGames();

  console.log("Reddit:", games);

  if (!games.length) {
    return api.channels.createMessage(data.channel_id, {
      content: "❌ No Reddit deals found"
    });
  }

  await api.channels.createMessage(data.channel_id, {
    content: `✅ Reddit found ${games.length} posts\n` +
             games.slice(0, 5).map(g => g.name).join("\n")
  });
}

if (command === "resetfree") {
  lastFreeGames = [];
  await api.channels.createMessage(data.channel_id, {
    content: "♻️ Cache reset"
  });
}

if (command === "testembed") {
  await api.channels.createMessage(CHANNEL_ID, {
    content: "🧪 Testing embed",
    embeds: [
      {
        title: "TEST GAME",
        url: "https://store.steampowered.com/app/570",
        description: "🆓 FREE NOW",
        image: {
          url: "https://cdn.cloudflare.steamstatic.com/steam/apps/570/header.jpg"
        },
        color: 0x00ff00,
        timestamp: new Date().toISOString()
      }
    ]
  });
}
});

client.on(GatewayDispatchEvents.Ready, async ({api, data}) => {
  const {username, discriminator} = data.user;
  console.log(`Logged in as @${username}#${discriminator}`);

  setInterval(async () => {
    try {

      await checkFreeGames(api);
    } catch (err) {
      console.error("Interval error:", err);
    }
  }, 1000 * 60 * 24)}); 

gateway.connect();