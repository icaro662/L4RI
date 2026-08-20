/*
Commands for wikipedia article fetch.
Search by term or get a random article.
*/
import axios from "axios";
import { client } from "../index.js";

async function getWikiArticle(message, args) {
    try {
        const searchTerm = args.join(" ");
        const res = await axios.get(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchTerm)}`,
            {
                headers: {
                    "User-Agent": "L4RI Discord Bot/1.0"
                }
            }
        );
        const data = res.data;

        if (data.type === "disambiguation") {
            await message.reply("The search term is too ambiguous. Please try to be more specific.");
            return;
        }

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
        console.error("Some error occurred:", error);
        await message.reply("Couldn't find a wikipedia article for that search term.");
    }
}

async function getRandomWiki(message, args) {
    try {
        const res = await axios.get(
        "https://en.wikipedia.org/api/rest_v1/page/random/summary",
        {
            headers: {
            "User-Agent": "L4RI Discord Bot/1.0"
            }
        }
        );
        const data = res.data;

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
        console.error("Some error occurred:", error);
        await message.reply("Couldn't find a random wikipedia article at the moment.");
    }
}

export async function handleWikiRandom(message, args) {
    await getRandomWiki(message, args);
}

export async function handleWikiSearch(message, args) {
    await getWikiArticle(message, args);
}