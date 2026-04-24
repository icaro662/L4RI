import 'dotenv/config';

export const definition = {
  name: 'img',
  description: 'Search for a image on Pexels',
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
  
  try {
    const axios = await import('axios');
    
    const response = await axios.default.get('https://api.pexels.com/v1/search', {
      headers: {
        'Authorization': clients.pexelsKey
      },
      params: {
        query: query,
        per_page: 1
      }
    });

    if (!response.data.photos || response.data.photos.length === 0) {
      return api.channels.createMessage(data.channel_id, {
        content: `No images found for: **${query}**`,
        message_reference: { message_id: data.id },
        allowed_mentions: { replied_user: false }
      });
    }

    const photo = response.data.photos[0];
    const message = `**Search result for: "${query}"**\n\n[Image by ${photo.photographer}](${photo.photographer_url})\n${photo.src.large}`;

    await api.channels.createMessage(data.channel_id, {
      content: message,
      message_reference: { message_id: data.id },
      allowed_mentions: { replied_user: false }
    });

  } catch (error) {
    console.error(error);
    await api.channels.createMessage(data.channel_id, {
      content: "Sorry, something went wrong while searching for images.",
      message_reference: { message_id: data.id },
        allowed_mentions: { replied_user: false }
    });
  }
}