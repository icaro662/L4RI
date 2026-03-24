import axios from "axios";

export async function handleYoutube(api, data, args, clients) {

    const query = args.join(" ");
    
    if (!query) {

      return api.channels.createMessage(data.channel_id, {
        content: "Give me something to search!",
        message_reference: { message_id: data.id },
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
