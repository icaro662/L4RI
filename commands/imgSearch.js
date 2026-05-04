import 'dotenv/config';

export async function handleImgSearch(message, args, clients) {
  const query = args.join(" ");
  
  if (!query) {
    return message.reply({
      content: "Usage: !imgsearch [search term]",
      message_reference: { message_id: message.id },
        allowed_mentions: { replied_user: false }
    });
  }
  
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
      return message.reply({
        content: `No images found for: **${query}**`,
        message_reference: { message_id: message.id },
        allowed_mentions: { replied_user: false }
      });
    }

    const photo = response.data.photos[0];
    const message = `**Search result for: "${query}"**\n\n[Image by ${photo.photographer}](${photo.photographer_url})\n${photo.src.large}`;

    await message.reply({
      content: message,
      message_reference: { message_id: message.id },
      allowed_mentions: { replied_user: false }
    });

  } catch (error) {
    console.error(error);
    await message.reply({
      content: "Sorry, something went wrong while searching for images.",
      message_reference: { message_id: message.id },
        allowed_mentions: { replied_user: false }
    });
  }
}