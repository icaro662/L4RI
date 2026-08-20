/* This file is the main entry point for the Fluxer bot. Here lives most of the bot's configuration, aswell as a command splitter. */

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
const mention = "<@1483928797831864671>"

/* Checks for valid bot token. throws an error if not found. */
const token = process.env["FLUXER_BOT_TOKEN"];
if (!token) {
  throw new Error("You forgot the token!");
}

/*
Initializes objected referencing all the API keys used in the bot. 
If any of the keys are not found, a warning is logged to the console.
*/
export const clients = {
  groq: new Groq({ apiKey: process.env.GROQ_API_KEY }),
  youtubeKey: process.env.YOUTUBE_API_KEY,
  ItadKey: process.env.ITAD_API_KEY,
  braveKey: process.env.BRAVE_API_KEY,
};

/* 
Converts the object entries into a array of pairs of name and keys. 
(i.e: { groq: "key1", youtubeKey: "key2" } => [["groq", "key1"], ["youtubeKey", "key2"]])

then .forEach iterates each element and checks if the key is not found. Logs on console if not. 
*/

Object.entries(clients).forEach(([name, key]) => {
  if (!key) {
    console.warn(`Warning: ${name} API key not found`);
  }
});

/*
Initializes the REST instance for the bot.

The REST instance is used for making API requests to the Fluxer API, such as sending messages or fetching data. It is created using the REST class from the @discordjs/rest package.

REST takes an object with the following properties:

api: The base URL for the Fluxer API.
version: The API version to use for requests.

.setToken sets the required bot token for the REST instance to authenticate requests to the Fluxer API.
*/

const rest = new REST({ 
  api: "https://api.fluxer.app", 
  version: "1" })
  .setToken(
  token,
);

/*
Initializes the WebSocketManager instance for the bot.

The WebSocketManager instance is used for managing the bot's WebSocket connection to the Discord API.

It takes an object with the following properties:
  
intents: An array of intents that the bot will listen to. In this case, it listens
for GuildMessages and MessageContent events.
rest: The REST instance created earlier, which is used for making API requests.
token: The bot token used for authenticating the WebSocket connection.
version: The API version to use for the WebSocket connection.
*/ 

const gateway = new WebSocketManager({
  intents: ["GuildMessages", "MessageContent"],
  rest,
  token,
  version: "1",
});


/*
Initializes the Fluxer client instance for the bot.

The client instance is used for interacting with the Fluxer API, such as sending messages or listening for events. It is created using the Client class from the @fluxerjs/core package.
*/
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

/*
Finally, the bot logs in using the provided token and connects to the Fluxer API through the WebSocketManager instance. This establishes the bot's connection and allows it to start receiving events and processing commands.
*/
client.login(token);
gateway.connect();