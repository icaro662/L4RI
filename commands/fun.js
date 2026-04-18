import axios from 'axios';
import { clients } from '../index.js';

let pastaCache = [];
let lastPastaFetch = 0;

console.log("Initializing copypasta fetch...");

async function fetchCopyPasta() {
    try {
        if (pastaCache.length > 0 || (Date.now() - lastPastaFetch) < 60000 * 60 * 24) { // 24 hours
            console.log("[1] Copypasta fetch is already filled. Using cached data.");
            return pastaCache;
        }

        const response = await axios.get("https://www.reddit.com/r/BrazilianCopypasta/new.json?limit=25", {
        headers: {
            "User-Agent": "Web:Fluxer-tool:1.0 (by /u/misha)",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive",
            },
        });

        console.log("[1] Fetching new copypasta...");
        console.log("[1] Reddit API response status:", response.status);

        const result = response.data.data.children
        .map((post, index) => ({
            index,
            title: post.data.title,
            selftext: post.data.selftext,
            url: post.data.url,
        }))
        .filter((postData) => postData.selftext && postData.selftext.length <= 2000);

        console.log("[1] Successfully fetched posts!");
        pastaCache = result;
        return pastaCache;
    } catch (err) {
        console.error("Error fetching copypasta:", err.response?.status);
        return pastaCache;
    }
}

export async function testRedditPasta() {
    console.log("Testing fetchCopyPasta...");
    const result = await fetchCopyPasta();
    console.log("Testing result:", pastaCache);

    const  response = await getCopyPasta();
    console.log("Random copypasta:", response);
    console.log("last fetched:", lastPastaFetch);

    console.log("Testing completed.");
}

async function getCopyPasta() {
    fetchCopyPasta(); // Ensure we have the latest copypasta

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

export async function postFetchInterval() {
    if (pastaCache.length === 0) {
        await fetchCopyPasta();
    }

    setInterval(fetchCopyPasta, 60000 * 60 * 24); // Fetch every 24 hours
}