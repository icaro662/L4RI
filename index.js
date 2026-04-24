import { Client, GatewayDispatchEvents } from "@discordjs/core";
import { REST } from "@discordjs/rest";
import { WebSocketManager } from "@discordjs/ws";
import { Groq } from "groq-sdk";
import "dotenv/config";
import { commandRegister } from "./utils/register.js";
import { gamesFetchInterval } from "./commands/freeGames.js";
import { pastaFetchInterval } from "./commands/pasta.js";
import { urlParser } from "./utils/urlParser.js";
/* import { handleGrok } from "./commands/grok.js";
import { handleGrokAnalyze } from './commands/grok.js';
import { handleSearch } from "./commands/search.js";
import { handleImgSearch } from "./commands/imgSearch.js";
import { handleFreeCheck } from "./commands/freeGames.js";
import { handleYoutube } from "./commands/youtube.js";
import { handleCopyPastaBR } from "./commands/pasta.js"; */

const userConversations = new Map();

const token = process.env["FLUXER_BOT_TOKEN"];
if (!token) {
  throw new Error("You forgot the token!");
}

export const clients = {
  groq: new Groq({ apiKey: process.env.GROQ_API_KEY }),
  pexelsKey: process.env.PEXELS_API_KEY,
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

const client = new Client({ rest, gateway });

client.on(GatewayDispatchEvents.MessageCreate, async ({ api, data }) => {
  if (data.content.includes("http://") || data.content.includes("https://")) {
    await urlParser(data, api);
  }
})

client.on(GatewayDispatchEvents.InteractionCreate, async ({ api, data }) => {
  if (data.type !== 2) return;

  const command = commands.get(data.data.name);
  if (!command) return;

  await api.interactions.defer(data.id, data.token);

  try {
    await command.execute(api, data, clients);
  } catch (err) {
    console.error(err);
    await api.interactions.followUp(data.application_id, data.token, {
      content: 'Something went wrong.'
    });
  }
});

client.on(GatewayDispatchEvents.Ready, async ({ api, data }) => {
  const { username, discriminator } = data.user;
  console.log(`Logged in as @${username}#${discriminator}`);

  await pastaFetchInterval();
  await gamesFetchInterval(api);
  await commandRegister();
});

gateway.connect();
