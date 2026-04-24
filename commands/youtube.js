import axios from "axios";

export const definition = {
  name: 'yt',
  description: 'Search for a YouTube video',
  options: [
    {
      name: 'query',
      description: 'What to search for',
      type: 3,
      required: true
    }
  ]
};

export async function execute(api, data) {
  const query = data.data.options.find(o => o.name === 'query')?.value;
  await handleYoutube(api, data, query, clients)
}

async function handleYoutube(api, data, query, clients) {
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
    
    await api.channels.createMessage(data.channel_id, {
      content: `${url}`,
      message_reference: { message_id: data.id },
      allowed_mentions: {
        replied_user: false 
      }
    });
  } catch (err) {
    console.error(err);
    await api.channels.createMessage(data.channel_id, {
      content: "Error searching YouTube.",
      message_reference: { message_id: data.id },
      allowed_mentions: {
        replied_user: false 
      }
    });
  }
}

