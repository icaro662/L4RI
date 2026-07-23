import './utils/envHelper.js';
import { Client, Events } from '@fluxerjs/core';
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import { Groq } from "groq-sdk";
import { gamesFetchInterval } from "./commands/freeGames.js";
import { pastaFetchInterval } from "./commands/fun.js";
import { handleCommand } from './utils/cmdFilter.js';


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

  try {
    await handleCommand(message, userConversations, clients, prefix, mention);
  } catch (error) {
    console.error("An unexpected error occurred:", error);
  }
});


client.on('error', (err) => {
  console.error('[WebSocket Error]', err.message);
});

client.on('shardError', (err, shardId) => {
  console.error(`[Shard ${shardId} Error]`, err.message);
});

client.on(Events.Ready, () => {
  console.log(`[L4RI] Logged in sucessfully!`);

  pastaFetchInterval();
  gamesFetchInterval(client);
});

client.login(token);
gateway.connect();