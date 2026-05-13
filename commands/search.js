import axios from 'axios';

function cleanDescription(text) {
  if (!text) return '';
  return text
    .replace(/<[^>]*>/g, '')                                    // strip HTML tags
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>               // hex entities &#x27;
      String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) =>                       // decimal entities &#39;
      String.fromCharCode(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

export async function handleSearch(message, args) {
  const query = args.join(" ");

  if (!query) {
    return message.reply({
      ping: false,
      content: "Usage: !search [your query]",
    });
  }

  try {
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': process.env.BRAVE_API_KEY,
      },
      params: {
        q: query,
        count: 5,
      }
    });

    const results = response.data?.web?.results;

    if (!results || results.length === 0) {
      return message.reply({
        ping: false,
        embeds: [{
          title: `No results found for: **${query}**`,
        }]
      });
    }

    const embedFields = results.slice(0, 5).map((result, index) => ({
      name: `${index + 1}. ${result.title}`,
      value: `[${result.url}](${result.url})\n${cleanDescription(result.description) || ''}`.trim(),
      inline: false,
    }));

    await message.reply({
      ping: false,
      embeds: [{
        title: `Search Results for: "${query}"`,
        fields: embedFields,
        color: 0x5865F2,
      }]
    });

  } catch (error) {
    console.error(error);
    const isAuthError = error.response?.status === 401;
    const isRateLimit = error.response?.status === 429;

    await message.reply({
      ping: false,
      embeds: [{
        title: isAuthError
          ? "Invalid Brave API key. Check your .env file."
          : isRateLimit
          ? "Search rate limit reached. Try again later."
          : "Sorry, an error occurred while fetching search results.",
      }]
    });
  }
}