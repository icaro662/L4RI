import { error as logError } from '../utils/logger.js';

import axios from 'axios';

/**
 * Sanitizes search result snippet descriptions by removing HTML markup tags
 * and decoding both hexadecimal, decimal, and common named HTML entities.
 *
 * Flow:
 * 1. Guard Check: Returns an empty string if input text is falsy.
 * 2. Tag Stripping: Removes all HTML tags matching `<[^>]*>`.
 * 3. Hex Entity Decoding: Replaces `&#x[hex];` with corresponding unicode characters.
 * 4. Decimal Entity Decoding: Replaces `&#[dec];` with corresponding unicode characters.
 * 5. Named Entity Decoding: Maps common HTML entities (&quot;, &amp;, &lt;, &gt;, &apos;, &nbsp;) to their character representations.
 * 6. Trimming: Strips leading and trailing whitespace before returning.
 *
 * @param {string} text - Raw HTML/text snippet from search API.
 * @returns {string} Sanitized plain-text description.
 */
function cleanDescription(text) {
  // Step 1: Guard against empty or null input.
  if (!text) return '';

  // Step 2: Strip HTML tags and decode hex, decimal, and named HTML entities.
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

/**
 * Searches the web using the Brave Search API and returns the top 5 results formatted as an embed.
 *
 * Flow:
 * 1. Query Extraction: Recombines argument tokens into a unified search query string.
 * 2. Validation: If query is blank, replies with usage instructions and halts execution.
 * 3. Search Request: Queries Brave Web Search endpoint with authorization token and request limit of 5.
 * 4. Results Check: If results list is empty or absent, replies with a "No results found" embed.
 * 5. Embed Field Mapping: Slices up to 5 results and formats them into fields with numbered titles, hyperlinks, and sanitized descriptions.
 * 6. Result Delivery: Sends the final search results embed to the channel.
 * 7. Error Handling: Logs errors via `logError`, handles specific HTTP 401 (auth) and 429 (rate limit) errors, and informs the user.
 *
 * @param {Object} message - Fluxer message object.
 * @param {string[]} args - Command arguments forming the web search query.
 * @param {Object} clients - Object holding API credentials, including `braveKey`.
 * @returns {Promise<Object|void>} Resolves when search results or error reply is sent.
 */
export async function handleSearch(message, args, clients) {
  // Step 1: Extract and validate search query from arguments.
  const query = args.join(" ");

  if (!query) {
    return message.reply({
      ping: false,
      content: "Usage: !search [your query]",
    });
  }

  try {
    // Step 2: Request search results from Brave Web Search API.
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': clients.braveKey,
      },
      params: {
        q: query,
        count: 5,
      }
    });

    const results = response.data?.web?.results;

    // Step 3: Validate that results exist and are non-empty.
    if (!results || results.length === 0) {
      return message.reply({
        ping: false,
        embeds: [{
          title: `No results found for: **${query}**`,
        }]
      });
    }

    // Step 4: Format top 5 results into embed fields with sanitized descriptions.
    const embedFields = results.slice(0, 5).map((result, index) => ({
      name: `${index + 1}. ${result.title}`,
      value: `[${result.url}](${result.url})\n${cleanDescription(result.description) || ''}`.trim(),
      inline: false,
    }));

    // Step 5: Send search results embed reply.
    await message.reply({
      ping: false,
      embeds: [{
        title: `Search Results for: "${query}"`,
        fields: embedFields,
        color: 0x5865F2,
      }]
    });

  } catch (error) {
    // Step 6: Handle specific API errors (401 auth, 429 rate limit) and log unexpected failures.
    logError('Search', 'Search error:', error);
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