/*
Command for searching videos through youtube.

Args:
message: The message object from the Discord API.
args: An array of arguments passed to the command (the user's search query).
clients: An object containing the YouTube API key.
*/

import axios from "axios";

export async function handleYoutube(message, args, clients) {
  
  const query = args.join(" ")
  
  if (!query) {
    return message.reply({
      ping: false,
      content: "Give me something to search!",
    });
  }
  
  try {
    const res = await axios.get(
      `https://www.googleapis.com/youtube/v3/search`,
      {
        params: {
          part: "snippet",
          q: query,
          key: clients.youtubeKey,
          maxResults: 1,
          type: "video"
        }
      }
    );
    
    const video = res.data.items[0];
    const url = `https://www.youtube.com/watch?v=${video.id.videoId}`;
    
    await message.send({
      content: `${url}`,
    });
  } catch (error) {
    console.error(error);
    await message.reply({
      ping: false,
      content: "Something went wrong during the processing",
    });
  }
}
