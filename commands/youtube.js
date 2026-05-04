import axios from "axios";

export async function handleYoutube(message, args, clients) {
  
  const query = args.join(" ")
  
  if (!query) {
    
    return message.reply({
      content: "Give me something to search!",
      message_reference: { message_id: message.id },
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
  } catch (err) {
    console.error(err);
    await message.send({
      content: "Error searching YouTube.",
      
    });
  }
}
