/**
 * Commands for Wikipedia article retrieval.
 * Supports searching by specific term or retrieving a random article.
 */
import axios from "axios";
import { client } from "../index.js";
import { error as logError } from '../utils/logger.js';

/**
 * Queries the Wikipedia REST API for a summary of an article matching the specified search term
 * and replies with an informative embed.
 *
 * Flow:
 * 1. Term Assembly: Joins `args` tokens into a single search string.
 * 2. API Request: Dispatches a GET request to the Wikipedia summary endpoint with encoded search term and custom User-Agent.
 * 3. Ambiguity Check: Inspects if the response represents a disambiguation page (`type === "disambiguation"`). If so, warns user to be more specific.
 * 4. Embed Delivery: Formats and sends a rich embed containing the article title, extract snippet, desktop page URL, and optional thumbnail.
 * 5. Error Handling: Catches 404 or network errors, logs via `logError`, and replies notifying that no article was found.
 *
 * @param {Object} message - Fluxer message object.
 * @param {string[]} args - Command arguments forming the Wikipedia search term.
 * @returns {Promise<void>}
 */
async function getWikiArticle(message, args) {
    try {
        // Step 1: Extract and URL-encode the search query.
        const searchTerm = args.join(" ");

        // Step 2: Fetch article summary from Wikipedia REST API.
        const res = await axios.get(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`,
            {
                headers: {
                    "User-Agent": "L4RI Fluxer Bot/1.0"
                }
            }
        );
        const data = res.data;

        // Step 3: Handle disambiguation pages.
        if (data.type === "disambiguation") {
            await message.reply("The search term is too ambiguous. Please try to be more specific.");
            return;
        }

        // Step 4: Reply with article summary embed.
        await message.reply({
            ping: false,
            embeds: [
                {
                    title: data.title,
                    description: data.extract,
                    url: data.content_urls.desktop.page,
                    image: { url: data.thumbnail?.source || null }
                },
            ]
        });
    } catch (error) {
        // Step 5: Catch and log errors, sending failure notice.
        logError('Wiki', 'Some error occurred:', error);
        await message.reply("Couldn't find a wikipedia article for that search term.");
    }
}

/**
 * Fetches a random Wikipedia article summary via the Wikipedia REST API and replies with an embed.
 *
 * Flow:
 * 1. API Request: Dispatches a GET request to the Wikipedia `/page/random/summary` endpoint.
 * 2. Data Parsing: Extracts article details (title, summary extract, desktop link, thumbnail).
 * 3. Embed Delivery: Sends a formatted embed displaying the random article to the channel.
 * 4. Error Handling: Catches network or API failures, logs them via `logError`, and responds with a failure message.
 *
 * @param {Object} message - Fluxer message object.
 * @param {string[]} args - Command arguments (unused for random lookup).
 * @returns {Promise<void>}
 */
async function getRandomWiki(message, args) {
    try {
        // Step 1: Request random article summary from Wikipedia REST API.
        const res = await axios.get(
        "https://en.wikipedia.org/api/rest_v1/page/random/summary",
        {
            headers: {
            "User-Agent": "L4RI Fluxer Bot/1.0"
            }
        }
        );
        const data = res.data;

        // Step 2: Parse response data and reply with article embed.
        await message.reply({
            ping: false,
            embeds: [
                {
                    title: data.title,
                    description: data.extract,
                    url: data.content_urls.desktop.page,
                    image: { url: data.thumbnail?.source || null }
                },
            ]
        });
    } catch (error) {
        // Step 3: Catch and log errors, sending failure notice.
        logError('Wiki', 'Some error occurred:', error);
        await message.reply("Couldn't find a random wikipedia article at the moment.");
    }
}

/**
 * Command handler entry point for fetching a random Wikipedia article (!randompedia).
 *
 * Flow:
 * 1. Delegates processing to `getRandomWiki(message, args)`.
 *
 * @param {Object} message - Fluxer message object.
 * @param {string[]} args - Command arguments array.
 * @returns {Promise<void>}
 */
export async function handleWikiRandom(message, args) {
    // Step 1: Delegate to getRandomWiki helper.
    await getRandomWiki(message, args);
}

/**
 * Command handler entry point for querying Wikipedia by term (!wiki [term]).
 *
 * Flow:
 * 1. Delegates processing to `getWikiArticle(message, args)`.
 *
 * @param {Object} message - Fluxer message object.
 * @param {string[]} args - Command arguments containing the search term.
 * @returns {Promise<void>}
 */
export async function handleWikiSearch(message, args) {
    // Step 1: Delegate to getWikiArticle helper.
    await getWikiArticle(message, args);
}