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
            await message.reply("O termo de busca utilizado é muito ambiguio. Por favor, tente ser mais específico.");
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
        console.error("Erro ao buscar artigo da Wikipedia:", error);
        await message.reply("Desculpe, não consegui encontrar um artigo da Wikipedia para o termo de busca fornecido.");
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
        console.error("Erro ao buscar artigo aleatório da Wikipedia:", error);
        await message.reply("Desculpe, não consegui buscar um artigo aleatório da Wikipedia no momento.");
    }
}

export async function handleWikiRandom(message, args) {
    await getRandomWiki(message, args);
}

export async function handleWikiSearch(message, args) {
    await getWikiArticle(message, args);
}