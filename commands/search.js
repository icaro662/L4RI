export const definition = {
  name: 'search',
  description: 'Search through DuckDuckGo',
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
  await handleSearch(api, data, query)
}

async function handleSearch(api, data, query) {
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
      
      return await api.channels.createMessage(data.channel_id, {
        content: message,
        message_reference: { message_id: data.id },
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
      return api.channels.createMessage(data.channel_id, {
        content: `No results found for: **${query}**`,
        message_reference: { message_id: data.id },
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
        await api.channels.createMessage(data.channel_id, {
          content: chunk,
          message_reference: { message_id: data.id },
          allowed_mentions: { replied_user: false }
        });
      }
    } else {
      await api.channels.createMessage(data.channel_id, {
        content: resultMessage,
        message_reference: { message_id: data.id },
        allowed_mentions: { replied_user: false }
      });
    }
    
  } catch (error) {
    console.error(error);
    await api.channels.createMessage(data.channel_id, {
      content: "Sorry, an error occurred while fetching search results.",
      message_reference: { message_id: data.id },
    });
  }
}