export async function handleSearch(message, args) {
    const query = args.join(" ");
  
    if (!query) {
    return message.reply({
      content: "Usage: !search [your query]",
      message_reference: { message_id: message.id },
      allowed_mentions: { replied_user: false}
    });
  }
  
  try {
    const axios = await import('axios');
    
    const response = await axios.default.get('https://api.duckduckgo.com/', {
      params: {
        q: query,
        format: 'json',
        no_html: 1
      }
    });

    const data_response = response.data;

    if (data_response.AbstractText && data_response.AbstractText.trim()) {
      const message = `**Answer for: "${query}"**\n\n${data_response.AbstractText}`;
      
      return await message.reply({
        content: message,
        message_reference: { message_id: message.id },
        allowed_mentions: { replied_user: false }
      });
    }

    let results = data_response.Results && data_response.Results.length > 0 
      ? data_response.Results 
      : [];

    if (results.length === 0 && data_response.RelatedTopics) {
      for (const topic of data_response.RelatedTopics) {
        if (topic.Topics) {
          results = results.concat(topic.Topics);
        } else if (topic.FirstURL) {
          results.push(topic);
        }
        if (results.length >= 5) break;
      }
    }

    if (results.length === 0) {
      return message.reply({
        content: `No results found for: **${query}**`,
        message_reference: { message_id: message.id },
      });
    }

    let resultMessage = `**Search Results for: "${query}"**\n\n`;
    
    results.slice(0, 5).forEach((result, index) => {
      resultMessage += `**${index + 1}. ${result.Text || result.Title || 'Result'}**\n`;
      resultMessage += `${result.FirstURL}\n\n`;
    });

    if (resultMessage.length > 2000) {
      const chunks = [];
      for (let i = 0; i < resultMessage.length; i += 2000) {
        chunks.push(resultMessage.substring(i, i + 2000));
      }
      for (const chunk of chunks) {
        await message.reply({
          content: chunk,
          message_reference: { message_id: message.id },
          allowed_mentions: { replied_user: false }
        });
      }
    } else {
      await message.reply({
        content: resultMessage,
        message_reference: { message_id: message.id },
        allowed_mentions: { replied_user: false }
      });
    }

  } catch (error) {
    console.error(error);
    await message.reply({
      content: "Sorry, an error occurred while fetching search results.",
      message_reference: { message_id: message.id },
    });
  }
}