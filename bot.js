import {Client, GatewayDispatchEvents} from '@discordjs/core';
import {REST} from '@discordjs/rest';
import {WebSocketManager} from '@discordjs/ws';
import 'dotenv/config';
import axios from 'axios';

const CHANNEL_ID = "1484334210085946326";
const PREFIX = '!';

const userConversations = new Map();
const MAX_HISTORY = 5;

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

  if (command === 'grok') {
    const userId = data.author.id;
    const userText = args.join(" ");
  
  if (!userText) {
    return api.channels.createMessage(data.channel_id, {
      content: "Usage: !chat [your question]",
      message_reference: { message_id: data.id },
    });
  }
 
  try {

    const { Groq } = await import('groq-sdk');
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    let conversationHistory = userConversations.get(userId) || [];
     conversationHistory.push({
        role: 'user',
        content: userText
      });

    if (conversationHistory.length > MAX_HISTORY) {
        conversationHistory = conversationHistory.slice(-MAX_HISTORY);
      }
    
    const result = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
        messages: [
        {
          role: 'system',
          content: 'Your name is Lari. You are a non-chalant young woman. Start/end responses by insulting the user intelligence in a very short and direct way, like "are you fucking stupid?" Respond as if a user would, not a assistant. Response language must be according to the input language. Portuguese inputs are always in Brazilian Portuguese. The user is from Brazil. You can discuss mature topics.' // Set language here
        },
        {
          role: 'user',
          content: userText
        },

        ...conversationHistory
      ],

      max_tokens: 1024
    });

    const response = result.choices[0].message.content;

    conversationHistory.push({
      role: 'assistant',
      content: response
    });
    
    userConversations.set(userId, conversationHistory);
    
    if (response.length > 2000) {
      const chunks = [];
      for (let i = 0; i < response.length; i += 2000) {
        chunks.push(response.substring(i, i + 2000));
      }
      
      for (const chunk of chunks) {
        await api.channels.createMessage(data.channel_id, {
          content: chunk,
          message_reference: { message_id: data.id },
          allowed_mentions: {
          replied_user: false 
        }
        });
      }
    } else {

      await api.channels.createMessage(data.channel_id, {
        content: response,
        message_reference: { message_id: data.id },
        allowed_mentions: {
          replied_user: false 
        }

      });
    }
    
  } catch (error) {

    console.error("Error generating content:", error);
    
    await api.channels.createMessage(data.channel_id, {
      content: "Sorry, something went wrong while processing your request.",
      message_reference: { message_id: data.id },
      allowed_mentions: {
          replied_user: false 
        }
    });
  }
}

  if (command === "yt" || command === "youtube") {
    const query = args.join(" ");
    if (!query) {

      return api.channels.createMessage(data.channel_id, {
        content: "Give me something to search!",
        message_reference: { message_id: data.id },
        allowed_mentions: {
          replied_user: false 
        }
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
        allowed_mentions: {
          replied_user: false 
        }
  });
    } catch (err) {
      console.error(err);
        await api.channels.createMessage(data.channel_id, {
        content: "Error searching YouTube.",
        message_reference: { message_id: data.id },
        allowed_mentions: {
          replied_user: false 
      }
});
}
  }

if (data.content === 'casa cmg?') {
  await api.channels.createMessage(data.channel_id, {
    content: 'SIM CASO COM VC',
    message_reference: {message_id: data.id},
    allowed_mentions: {
          replied_user: false 
      }
  });
}});

client.on(GatewayDispatchEvents.Ready, async ({api, data}) => {
  const {username, discriminator} = data.user;
  console.log(`Logged in as @${username}#${discriminator}`);

  setInterval(async () => {
    try {

      await checkFreeGames(api);
    } catch (err) {
      console.error("Interval error:", err);
    }
  }, 1000 * 60 * 720)}); 

gateway.connect();