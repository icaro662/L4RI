import { error as logError } from '../utils/logger.js';

import 'dotenv/config';
import axios from 'axios';

export async function handleImgSearch(message, args, clients) {
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

    if (!searchResponse.data?.results?.length) {
      return await loadingMessage.edit({
        embeds: [{
          title: "No images found",
          description: `No results for **${query}**`,
          color: 0xFFAA00,
        }]
      });
    }

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