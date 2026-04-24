import { commands } from '../commands/loader.js';
import { Routes } from 'discord-api-types/v9';
import { REST } from '@discordjs/rest';

const rest = new REST({ 
  api: 'https://api.fluxer.app', 
  version: '1' 
}).setToken(process.env.FLUXER_BOT_TOKEN);

export async function commandRegister() {
  const definitions = [...commands.values()].map(c => c.definition);

  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: definitions }
  );

  console.log('Commands registered!');
}