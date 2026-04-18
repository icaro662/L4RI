import { Client, GatewayDispatchEvents } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import { Groq } from "groq-sdk";
import "dotenv/config";
import { gamesFetchInterval } from "./commands/freeGames.js";
import { pastaFetchInterval } from "./commands/fun.js";
import { urlParser } from "./utils/urlParser.js";
import { handleGrok } from "./commands/grok.js";
import { handleGrokAnalyze } from './commands/grok.js';
import { handleSearch } from "./commands/search.js";
import { handleImgSearch } from "./commands/imgSearch.js";
import { handleFreeCheck } from "./commands/freeGames.js";
import { handleYoutube } from "./commands/youtube.js";
import { handleCopyPastaBR } from "./commands/fun.js";

const userConversations = new Map();
const PREFIX = "!";

const token = process.env["FLUXER_BOT_TOKEN"];
if (!token) {
  throw new Error("You forgot the token!");
}

export const clients = {
  groq: new Groq({ apiKey: process.env.GROQ_API_KEY }),
  pexelsKey: process.env.PEXELS_API_KEY,
  youtubeKey: process.env.YOUTUBE_API_KEY,
  botId: "1483928797831864671",
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

const client = new Client({ rest, gateway });

client.on(GatewayDispatchEvents.MessageCreate, async ({ api, data }) => {
  if (data.author.index) {
    return;
  }

  const indexId = clients.indexId;
  const MENTION = data.content.startsWith(`<@${indexId}>`)
    ? `<@${indexId}>`
    : `<@!${indexId}>`;

    if (data.content.includes("http://") || data.content.includes("https://")) {
      await urlParser(data);
    }

  if (data.content.startsWith(MENTION)) {

    try {
      if (data.attachments && data.attachments.length > 0) {
        const question = data.content.replace(MENTION, "").trim();
        await handleGrokAnalyze(api, data, [question], userConversations, clients);
      } else {
        const question = data.content.replace(MENTION, "").trim();
        await handleGrok(api, data, [question], userConversations, clients);
      }

    } catch (error) {
      console.error("Unexpected error:", error);
    }
  } 

  if (data.content.startsWith(PREFIX)) {
    const args = data.content.slice(PREFIX.length).trim().split(" ");
    const command = args.shift().toLowerCase();

    try {
      if (command === "search") {
        await handleSearch(api, data, args);
      } else if (command === "img") {
        await handleImgSearch(api, data, args, clients);
      } else if (command === "yt" || command === "youtube") {
        await handleYoutube(api, data, args, clients);
      } else if (command === "checkfree" || command === "check") {
        await handleFreeCheck (api, data, args, clients)
      } else if (command === "copypasta") {
        await handleCopyPastaBR(api, data, args, clients);
      } else if (command === "help") {
        await api.channels.createMessage(data.channel_id, {
          embeds: [
            {
              title: "Available commands",
              description: `

          Generative AI commands:\n

          @index [attachment] [question] - Analyze an image with Groq\n
          @index [question] - Ask Groq a question or have a conversation\n

          General search commands:\n

          !search [query] - Search the web using DuckDuckGo\n
          !img [query] - Search for images using Pexels\n
          !yt or !youtube [query] - Search for YouTube videos\n
          !check or !checkfree - Check for new free games (Steam, Epic, GOG)\n
          !copypasta - Get a random copypasta from r/BrazilianCopypasta\n

          Other commands:\n

          !help - Show this help message`,
          message_reference: { message_id: data.id },
          allowed_mentions: { replied_user: false },
            },
          ],
        });
      }
    } catch (error) {
      console.error("Command error:", error);
    }
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

  pastaFetchInterval();
  gamesFetchInterval(api);
});

gateway.connect();
