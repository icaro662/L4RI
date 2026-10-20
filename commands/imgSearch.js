import { error as logError } from '../utils/logger.js';

import 'dotenv/config';
import axios from 'axios';

/**
 * Searches for web images matching a user query using the Brave Image Search API
 * and displays the first valid image embed.
 *
 * Flow:
 * 1. Query Parsing: Joins `args` into a unified `query` string.
 * 2. Query Validation: Checks if `query` is non-empty; if empty, replies with a usage embed and exits.
 * 3. Status Feedback: Posts an initial "Searching images..." loading embed to the channel.
 * 4. API Request: Dispatches a GET request to Brave Image Search endpoint with `clients.braveKey`, requesting up to 10 results with a 20s timeout.
 * 5. Fetch Error Handling: Catches specific API/network failures (timeout `ECONNABORTED`, HTTP error codes) and updates the loading embed.
 * 6. Result Check: Confirms results array exists and has elements; if empty, edits loading embed to notify "No images found".
 * 7. URL Sanitization: Finds the first result with a valid HTTP/HTTPS URL, ignoring inline base64 `data:image` strings.
 * 8. Embed Delivery: Replaces the loading embed with the search result embed featuring the image.
 * 9. Catch-All Error Handling: Catches unexpected exceptions, logs via `logError`, and edits loading message with failure information.
 *
 * @param {Object} message - Fluxer message object.
 * @param {string[]} args - Command arguments forming the image search query.
 * @param {Object} clients - Object containing API credentials, specifically `braveKey`.
 * @returns {Promise<Object|void>} Resolves when the result or error embed is sent.
 */
export async function handleImgSearch(message, args, clients) {
  // Step 1: Parse and validate search query from arguments.
  const query = args.join(" ");

  if (!query) {
    return message.reply({
      ping: false,
      embeds: [{
        title: "Usage: !img [query]",
        color: 0xFF0000,
      }]
    });
  }

  let loadingMessage;

  try {
    // Step 2: Post initial loading status embed.
    loadingMessage = await message.reply({
      ping: false,
      embeds: [{
        title: "Searching images...",
        description: `Query: **${query}**`,
        color: 0x5865F2,
      }]
    });

    let searchResponse;

    try {
      // Step 3: Query Brave Image Search API with timeout and safe search settings.
      searchResponse = await axios.get(
        'https://api.search.brave.com/res/v1/images/search',
        {
          headers: {
            Accept: 'application/json',
            'X-Subscription-Token': clients.braveKey,
          },
          params: {
            q: query,
            count: 10,
            safe_search: 'off',
          },
          timeout: 20000,
        }
      );

    } catch (fetchError) {
      // Step 4: Handle specific fetch/network errors if request fails.
      const isTimeout = fetchError.code === 'ECONNABORTED';
      const status = fetchError.response?.status;

      const errorMsg = isTimeout
        ? "Brave image search timed out."
        : status
        ? `Brave returned HTTP ${status}.`
        : `Unexpected error: ${fetchError.message}`;

      return await loadingMessage.edit({
        embeds: [{
          title: "Image search failed",
          description: errorMsg,
          color: 0xFF0000,
        }]
      });
    }

    // Step 5: Check if results list contains any items.
    if (!searchResponse.data?.results?.length) {
      return await loadingMessage.edit({
        embeds: [{
          title: "No images found",
          description: `No results for **${query}**`,
          color: 0xFFAA00,
        }]
      });
    }

    // Step 6: Find first valid HTTP/HTTPS image URL (ignoring inline data URIs).
    const img = searchResponse.data.results.find(result => {
      const url = result.properties?.url || "";

      return (
        url.startsWith("http") &&
        !url.includes("data:image")
      );
    });

    if (!img?.properties?.url) {
      return await loadingMessage.edit({
        embeds: [{
          title: "No embeddable images found",
          description:
            "Brave returned results, but none had valid image URLs.",
          color: 0xFFAA00,
        }]
      });
    }

    // Step 7: Update loading embed with final image result.
    await loadingMessage.edit({
      embeds: [{
        title: `Search result for: "${query}"`,
        image: {
          url: img.properties.url
        },
        color: 0x5865F2,
      }]
    });

  } catch (error) {
    // Step 8: Catch and log unexpected runtime errors.
    logError('ImgSearch', 'Image search error:', error);

    if (loadingMessage) {
      await loadingMessage.edit({
        embeds: [{
          title: "Image search failed",
          description: `Unexpected error:\n\`${error.message}\``,
          color: 0xFF0000,
        }]
      }).catch(() => {});
    }
  }
}