/**
 * Command for searching videos through YouTube.
 */

import axios from "axios";
import { log, error as logError } from '../utils/logger.js';

/**
 * Searches YouTube for videos matching a user query using the YouTube Data API v3
 * and posts the video URL to the channel.
 *
 * Flow:
 * 1. Query Parsing: Recombines argument tokens into a single search query string.
 * 2. Input Validation: Verifies that `query` is non-empty; if empty, replies asking for a query and terminates early.
 * 3. YouTube API Query: Sends an HTTP GET request to YouTube Data API v3 `/search` endpoint with query, video filter, and limit 1.
 * 4. Results Check: If the `/search` response has no items, replies with an explicit "No results found." message and terminates early.
 * 5. URL Resolution: Extracts the first matched video item and constructs a standard `https://www.youtube.com/watch?v=${videoId}` watch link.
 * 6. Link Dispatch: Sends the resolved video link to the channel via `message.send`.
 * 7. Error Handling: Catches any network/API errors, logs them using `logError`, and replies informing the user of the failure.
 *
 * @param {Object} message - Fluxer message object.
 * @param {string[]} args - Command arguments array forming the YouTube search query.
 * @param {Object} clients - Object holding API credentials, specifically `youtubeKey`.
 * @returns {Promise<Object|void>} Resolves when the search link or error reply is posted.
 */
export async function handleYoutube(message, args, clients) {
  // Step 1: Extract and validate search query from arguments.
  const query = args.join(" ");

  if (!query) {
    return message.reply({
      ping: false,
      content: "Give me something to search!",
    });
  }

  try {
    // Step 2: Query YouTube Data API v3 for top video match.
    const res = await axios.get(
      `https://www.googleapis.com/youtube/v3/search`,
      {
        params: {
          part: "snippet",
          q: query,
          key: clients.youtubeKey,
          maxResults: 1,
          type: "video",
          safeSearch: "none"
        }
      }
    );

    // Step 3: Reply explicitly when the search returns no results.
    if (!res.data.items || res.data.items.length === 0) {
      return message.reply({
        ping: false,
        content: "No results found.",
      });
    }

    // Step 4: Extract video ID and construct YouTube watch URL.
    const video = res.data.items[0];

    const url = `https://www.youtube.com/watch?v=${video.id.videoId}`;

    // Step 5: Send YouTube video link to channel.
    await message.send({
      content: `${url}`,
    });
  } catch (error) {
    // Step 6: Catch and log unexpected API/network errors, notifying user.
    logError('Youtube', 'YouTube search error:', error);
    await message.reply({
      ping: false,
      content: "Something went wrong during the processing",
    });
  }
}
