import axios from 'axios';
import { clients } from '../index.js';

let pastaCache = [];
let lastPastaFetch = 0;

console.log("[L4RI] Fetching copypastas...");

export async function fetchCopyPasta() {
    try {
        if (pastaCache.length > 0 || (Date.now() - lastPastaFetch) < 60000 * 60 * 24) { // 24 hours
            console.log("[L4RI] Copypasta fetch is already filled. Using cached message.");
            return pastaCache;
        }

        const response = await axios.get("https://www.reddit.com/r/BrazilianCopypasta/new.json?limit=25", {
        headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive',
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:152.0) Gecko/20100101 Firefox/152.0' 
            },
        });

        console.log("[L4RI] Copypastas fetch status code:", response.status);

        const result = response.data.data.children
        .map((post, index) => ({
            index,
            title: post.data.title,
            selftext: post.data.selftext,
            url: post.data.url,
        }))
        .filter((postData) => postData.selftext && postData.selftext.length <= 2000);

        console.log("[L4RI] Successfully fetched copypastas!");
        pastaCache = result;
        return pastaCache;
    } catch (err) {
        console.error("[L4RI] Error fetching copypasta:", err.response?.status);
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


export async function handleCopyPastaBR(message, args, clients) {

    try{    
        const copypasta = await getCopyPasta();
        await message.send({
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
    console.error("[L4RI] Error handling copypasta command:", err);
    await message.send({
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