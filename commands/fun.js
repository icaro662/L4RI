import axios from 'axios';
import { clients } from '../index.js';

let pastaCache = [];
let lastPastaFetch = 0;

console.log("[L4RI] Initializing copypasta fetch...");

export async function fetchCopyPasta() {
    try {
        if (pastaCache.length > 0 || (Date.now() - lastPastaFetch) < 60000 * 60 * 24) { // 24 hours
            console.log("[1] Copypasta fetch is already filled. Using cached data.");
            return pastaCache;
        }

        const response = await axios.get("https://www.reddit.com/r/BrazilianCopypasta/new.json?limit=50", {
        headers: {
            "User-Agent": "Web:Fluxer-tool:1.0 (by /u/misha)",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive",
            },
        });

        console.log("[L4RI] Fetching new copypasta...");
        console.log("[L4RI] Fetching copypasta response status:", response.status);

        const result = response.data.data.children
        .map((post, index) => ({
            index,
            title: post.data.title,
            selftext: post.data.selftext,
            url: post.data.url,
        }))
        .filter((postData) => postData.selftext && postData.selftext.length <= 2000);

        console.log("[L4RI] Successfully fetched copypasta!");
        pastaCache = result;
        return pastaCache;
    } catch (err) {
        console.error("Error fetching copypasta:", err.response?.status);
        return pastaCache;
    }
}

export async function getCopyPasta() {
    await fetchCopyPasta(); // Ensure we have the latest copypasta

    const Randomizer = Math.floor(Math.random() * pastaCache.length);
    let fetchedPasta = pastaCache[Randomizer];

    if (fetchedPasta === lastPastaFetch) {
        return fetchCopyPasta(); // Fetch another if the same copypasta is selected
    } else {

    lastPastaFetch = fetchedPasta;
    return pastaCache[Randomizer];
    }
}

export async function handleCopyPastaBR(api, data, args, clients) {

    try{    
        const copypasta = await getCopyPasta();
        await api.channels.createMessage(data.channel_id, {
            embeds: [
            {
                title: copypasta.title,
                description: copypasta.selftext,
                url: copypasta.url,
                timestamp: new Date().toISOString(),
            },
        ],
      });
    } catch (err) {
    console.error("Error handling copypasta command:", err);
    await api.channels.createMessage(data.channel_id, {
        embeds: [{content: "Sorry, something went wrong while fetching the copypasta.",}]
      });
    }
}

export async function pastaFetchInterval() {
    if (pastaCache.length === 0) {
        await fetchCopyPasta();
    }

    setInterval(fetchCopyPasta, 60000 * 60 * 24); // Fetch every 24 hours
}