import './utils/envHelper.js';
import { Client, Events } from '@fluxerjs/core';
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import { Groq } from "groq-sdk";
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
import { handleAvatar } from "./commands/avatar.js";
import { handleCanvas } from './commands/canvas.js';
import { handleImageGen } from './commands/imgGen.js';

const userConversations = new Map();
const prefix = "!";
const mention = "<@1483928797831864671>";

const token = process.env["FLUXER_BOT_TOKEN"];
if (!token) {
  throw new Error("You forgot the token!");
}

export const clients = {
  groq: new Groq({ apiKey: process.env.GROQ_API_KEY }),
  youtubeKey: process.env.YOUTUBE_API_KEY,
  ItadKey: process.env.ITAD_API_KEY,
  braveKey: process.env.BRAVE_API_KEY,
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
  intents: ["GuildMessages", "MessageContent"],
  rest,
  token,
  version: "1",
});


export const client = new Client();

client.on(Events.MessageCreate, async (message) => {

//console.log("message:", message)
//console.log("message.content:", message.content)
//console.log("message.attachments:", message.attachments)
if (message.author.bot) return;

  try {
    if (message.content.startsWith(mention)) {
      try {
        if (message.attachments?.size > 0) {
          const question = message.content.replace(mention, "").trim();
          await handleGrokAnalyze(message, [question], userConversations, clients);
        } else {
          const question = message.content.replace(mention, "").trim();
          await handleGrok(message, [question], userConversations, clients);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      }
    } 
    else if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(" ");
      const command = args.shift().toLowerCase();
      
      try {
        if (command === "search") {
          await handleSearch(message, args, clients);
        } else if (command === "img") {
          await handleImgSearch(message, args, clients);
        } else if (command === "grok") {
          await handleGrok(message, args, userConversations, clients);
        } else if (command === "analyze") {
          await handleGrokAnalyze(message, args, userConversations, clients); 
        }else if (command === "yt" || command === "youtube") {
          await handleYoutube(message, args, clients);
        } else if (command === "checkfree" || command === "check") {
          await handleFreeCheck(message, args, clients)
        } else if (command === "avatar") {
          await handleAvatar(message, args)
        } else if (command === "copypasta") {
          await handleCopyPastaBR(message, args, clients);
        } else if (command === "imagine") {
          await handleImageGen(message, args)
        } else if (command === "canvas") {
          await handleCanvas(message, args, clients)
        } else if (command === "randompedia") {
          await handleWikiRandom(message, args);
        } else if (command === "wiki") {
          await handleWikiSearch(message, args);
        } else if (command === "help") {
          await message.reply({ 
            ping: false,
            embeds: [
              {
                title: "Available commands",
                description: `
                  Generative AI commands:\n
                
                  @L4RI [attachment] [question] - Analyze an image with Groq\n
                  @L4RI [question] - Ask Groq a question or have a conversation\n
                  !imagine [text] - Generate a image based on the query\n
                        
                  General search commands:\n
                        
                  !search [query] - Search the web using Brave search\n
                  !img [query] - Search for images using Pexels\n
                  !yt or !youtube [query] - Search for YouTube videos\n
                  !check or !checkfree - Check for new free games (Steam, Epic games)\n
                  !copypasta - Get a random copypasta from r/BrazilianCopypasta\n
                  !avatar or !avatar @mention - Get your own avatar or mentioned member's avatar\n
                  !canvas caption [text] - Insert a caption into a image\n
                  !wiki [termo] - Procura por um artigo na Wikipedia\n
                  !randompedia - Retorna um artigo aleatório da Wikipedia\n
                        
                  Other commands:\n
                        
                  !help - Show this helpful message`
                },
              ],
          });
        }
      } catch (error) {
        console.error("Command error:", error);
      }
    } 
    else if (message.content === "casa cmg?") {
      await message.reply({
        ping: false,
        content: "SIM CASO COM VC",
      });
    }
    else if (message.content.includes("http://") || message.content.includes("https://")) {
      await urlParser(message);
    } 
  } catch (err) {
    console.error("FATAL MESSAGE ERROR:", err);
  }
}});


client.on('error', (err) => {
  console.error('[WebSocket Error]', err.message);
});

client.on('shardError', (err, shardId) => {
  console.error(`[Shard ${shardId} Error]`, err.message);
});

client.on(Events.Ready, () => {
  console.log(`[L4RI] Logged in sucessfully!`);

  //console.log("client.channels:", client.channels)
  pastaFetchInterval();
  gamesFetchInterval(client);
});

client.login(token);
gateway.connect();