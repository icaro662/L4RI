import { Client, GatewayDispatchEvents } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import { handleSearch } from "./commands/search.js";
import { handleGrok } from "./commands/grok.js";
import { handleGrokAnalyze } from './commands/grok.js';
import { handleImgSearch } from "./commands/imgSearch.js";
import { startFreeGamesChecker } from "./commands/freeGames.js";
import { handleYoutube } from "./commands/youtube.js";
import { Groq } from "groq-sdk";
import "dotenv/config";

const userConversations = new Map();
const PREFIX = "!";

const token = process.env["FLUXER_BOT_TOKEN"];
if (!token) {
  throw new Error("You forgot the token!");
}

const clients = {
  groq: new Groq({ apiKey: process.env.GROQ_API_KEY }),
  pexelsKey: process.env.PEXELS_API_KEY,
  itadKey: process.env.ITAD_API_KEY,
  youtubeKey: process.env.YOUTUBE_API_KEY,
};

Object.entries(clients).forEach(([name, key]) => {
  if (!key) {
    console.warn(`Warning: ${name} API key not found`);
  }
});

const rest = new REST({ api: "https://api.fluxer.app", version: "1" }).setToken(
  token,
);

const gateway = new WebSocketManager({
  intents: 513,
  rest,
  token,
  version: "1",
});

function extractUrls(text) {
  return text.match(/https?:\/\/\S+/g) || [];
}

function getEmbedVariants(url) {
  if (url.includes("instagram.com") || url.includes("instagram/reel")) {
    return [
      url.replace("instagram.com", "ddinstagram.com"),
      url.replace("instagram.com", "ssinstagram.com"),
      url,
    ];
  }

  if (url.includes("twitter.com") || url.includes("x.com")) {
    return [
      url.replace(/(twitter|x)\.com/, "fxtwitter.com"),
      url.replace(/(twitter|x)\.com/, "vxtwitter.com"),
      url,
    ];
  }

  if (url.includes("reddit.com")) {
    return [url.replace("reddit.com", "rxddit.com"), url];
  }

  return [url];
}

const client = new Client({ rest, gateway });

client.on(GatewayDispatchEvents.MessageCreate, async ({ api, data }) => {
  if (data.author.bot) {
    return;
  }

  if (!data.content.startsWith(PREFIX)) {
    const urls = extractUrls(data.content);

    if (urls.length > 0) {
      for (let url of urls) {
        if (
          url.includes("instagram.com") ||
          url.includes("instagram/reel") ||
          url.includes("twitter.com") ||
          url.includes("x.com") ||
          url.includes("reddit.com")
        ) {
          const variants = getEmbedVariants(url);

          await api.channels.deleteMessage(data.channel_id, data.id);

          await api.channels.createMessage(data.channel_id, {
            content:
              "Message sent by " + data.author.username + "\n" + variants[0],
          });
        }
      }
      return;
    }
  }

  const args = data.content.slice(PREFIX.length).trim().split(" ");
  const command = args.shift().toLowerCase();

  try {
    if (command === "search") {
      await handleSearch(api, data, args);
    } else if (command === "grok") {
      await handleGrok(api, data, args, userConversations, clients);
    } else if (command === "img") {
      await handleImgSearch(api, data, args, clients);
    } else if (command === "yt" || command === "youtube") {
      await handleYoutube(api, data, args, clients);
    } else if (command === "analyze" || command === "analise") {
      await handleGrokAnalyze(api, data, args, userConversations, clients);
    } else if (command === "help") {
      await api.channels.createMessage(data.channel_id, {
        content: `Available commands:\n
        !search [query] - Search the web using DuckDuckGo\n
        !grok [question] - Ask Groq a question or have a conversation\n
        !img [query] - Search for images using Pexels\n
        !yt [query] - Search for YouTube videos\n
        !analyze [question] (with image attachment) - Analyze an image with Groq\n
        !help - Show this help message`,
        message_reference: { message_id: data.id },
        allowed_mentions: { replied_user: false },
      });
    }
  } catch (error) {
    console.error("Command error:", error);
  }

  if (data.content === "casa cmg?") {
    await api.channels.createMessage(data.channel_id, {
      content: "SIM CASO COM VC",
      message_reference: { message_id: data.id },
      allowed_mentions: { replied_user: false },
    });
  }
});

client.on(GatewayDispatchEvents.Ready, async ({ api, data }) => {
  const { username, discriminator } = data.user;
  console.log(`Logged in as @${username}#${discriminator}`);

  startFreeGamesChecker(api);
});

gateway.connect();
