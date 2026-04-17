import axios from 'axios';

let pastaCache = [];

console.log("funUtils loaded");

async function getCopypasta() {
    try {
        const response = await axios.get("https://www.reddit.com/r/BrazilianCopypasta/new.json?limit=50", {
        headers: {
            "User-Agent": "web:Fluxer-tool:1.0 (by /u/misha)",
            "Accept": "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Connection": "keep-alive"
        },
    });

        console.log("Reddit API response status:", response.status);
        /* console.log("Reddit API response data:", response.data.data.children[0]); */ // Logs the first post to understand the structure
        /* console.log("Step one - logs the entire API response data to understand its structure and content"); */

        const result = response.data.data.children
        .map((post, index) => ({
            index,
            title: post.data.title,
            selftext: post.data.selftext,
            url: post.data.url,
        }))
        .filter((postData) => postData.selftext && postData.selftext.length <= 2000);
            
        const allIndexes = result.map((post) => post.index);
        const randomIndex = Math.floor(Math.random() * result.length);

        console.log("All post indexes:", allIndexes);
        console.log("mapped posts:", result);
        console.log("Step two - Map posts inside the response array and filters them\n to only include those with selftext and a length of 2000 characters or less, then selects a random post from the filtered list");
        
        let fetchedPastaID = result[randomIndex] || "No copypasta found.";
        pastaCache = fetchedPastaID;

        console.log("Fetched copypasta:", pastaCache);
        console.log("Step three - Return the randomly fetched copypasta");
        return pastaCache;
    } catch (err) {
        console.error("Error fetching copypasta:", err.response?.status);
        return "Sorry, couldn't fetch a copypasta right now.";
    }
}

export async function handleCopyPastaBR(api, data, args, clients) {{ 
    try{    
    const copypasta = await getCopypasta();
     await api.channels.createMessage(data.channel_id, {
        embeds: [
          {
            title: copypasta.title,
            description: copypasta.selftext,
            url: copypasta.url,
            color: 0xffff00,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } catch (err) {
    console.error("Error handling copypasta command:", err);
    await api.channels.createMessage(data.channel_id, "Sorry, couldn't fetch a copypasta right now.");
  }}
}