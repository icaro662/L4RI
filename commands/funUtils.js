import axios from 'axios';
import { clients } from '../bot.js';

let pastaCache = [];
let lastPastaFetch = 0;

console.log("funUtils loaded.\nInitializing copypasta fetch...");

async function fetchCopyPasta() {
    try {
        const response = await axios.get("https://reddit34.p.rapidapi.com/getPostsBySubreddit?subreddit=BrazilianCopypasta&sort=new", {
        headers: {
            "Content-Type": "application/json",
            "x-rapidapi-host": "reddit34.p.rapidapi.com",
            "x-rapidapi-key": clients.rapidApiKey,
            },
        });

        console.log("Fetched copypasta:", response.data.data.posts);
        console.log("[1] Fetching new copypasta...");
        console.log("[1] Reddit API response status:", response.status);

        const result = response.data.data.posts
        .map((post, index) => ({
            index,
            title: post.data.title,
            selftext: post.data.selftext,
            url: post.data.url,
        }))
        .filter((postData) => postData.selftext && postData.selftext.length <= 2000);

        console.log("Successfully fetched posts!");
        pastaCache = result;
        return pastaCache;
    } catch (err) {
        console.error("Error fetching copypasta:", err.response?.status);
        return pastaCache;
    }
}

async function getCopyPasta() {

    if (pastaCache.length === 0 || Date.now() - lastPastaFetch > 24 * 60 * 60 * 1000) { // Fetch new copypasta if cache is empty or older than 24 hours
        await fetchCopyPasta();
    } 

    const RandomFetchedPasta = Math.floor(Math.random() * pastaCache.length);
    if (RandomFetchedPasta === lastPastaFetch) {
        return fetchCopyPasta(); // Fetch another if the same copypasta is selected
    } else {

    lastPastaFetch = RandomFetchedPasta;
    return pastaCache[RandomFetchedPasta];
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