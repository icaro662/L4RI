import 'dotenv/config';
import {Client, GatewayDispatchEvents} from '@discordjs/core';
import {REST} from '@discordjs/rest';
import {WebSocketManager} from '@discordjs/ws';
import axios from 'axios';

const PREFIX = '!';
const YT_API_KEY = process.env['YOUTUBE_API_KEY'];
if (!YT_API_KEY) {
  throw new Error('You forgot the YouTube API key!');
}

const token = process.env['FLUXER_BOT_TOKEN'];
if (!token) {
  throw new Error('You forgot the token!');
}

const rest = new REST({api: 'https://api.fluxer.app', version: '1'}).setToken(token);

const gateway = new WebSocketManager({
  intents: 513,
  rest,
  token,
  version: '1',
});

const client = new Client({rest, gateway});

client.on(GatewayDispatchEvents.MessageCreate, async ({api, data}) => {
  if (data.author.bot) {
    return;
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
});

client.on(GatewayDispatchEvents.Ready, ({data}) => {
  const {username, discriminator} = data.user;
  console.log(`Logged in as @${username}#${discriminator}`);
});

gateway.connect();