import 'dotenv/config';
import {Client, GatewayDispatchEvents} from '@discordjs/core';
import {REST} from '@discordjs/rest';
import {WebSocketManager} from '@discordjs/ws';
import axios from 'axios';
import { spawn } from "child_process";

//Processa a variável de ambiente para o prefixo do comando, a chave da API do YouTube e o token do bot. Se alguma dessas variáveis não estiver definida, o código lançará um erro.
const CHANNEL_ID = "1484334210085946326";
let lastFreeGames = [];

const PREFIX = '!';
const YT_API_KEY = process.env['YOUTUBE_API_KEY'];
if (!YT_API_KEY) {
  throw new Error('You forgot the YouTube API key!');
}

const token = process.env['FLUXER_BOT_TOKEN'];
if (!token) {
  throw new Error('You forgot the token!');
}

//Configura o cliente REST e o gerenciador de WebSocket para se conectar à API do Fluxer usando o token fornecido. O cliente REST é usado para fazer solicitações à API, enquanto o gerenciador de WebSocket é responsável por manter a conexão em tempo real com o servidor do Fluxer.
const rest = new REST({api: 'https://api.fluxer.app', version: '1'}).setToken(token);


//Configura o gerenciador de WebSocket para se conectar à API do Fluxer usando o token fornecido. Ele especifica os intents (513) para receber eventos relacionados a mensagens e presença, e define a versão da API como '1'.
const gateway = new WebSocketManager({
  intents: 513,
  rest,
  token,
  version: '1',
});

async function getSteamDBStyleFreeGames() {
  const res = await axios.get(
    "https://store.steampowered.com/api/featuredcategories"
  );

  const items = res.data.specials.items;

  return items.filter(game =>
    game.discount_percent === 100 &&
    game.original_price > 0
  );
}

function getNewGames(current, previous) {
  return current.filter(
    g => !previous.some(p => p.id === g.id)
  );
}

async function checkFreeGames(api) {
  try {
    const current = await getSteamDBStyleFreeGames();
    const newGames = getNewGames(current, lastFreeGames);

    if (newGames.length > 0) {
      const embeds = newGames.slice(0, 3).map(game => ({
        title: game.name,
        url: `https://store.steampowered.com/app/${game.id}`,
        description: `💰 ~~$${(game.original_price / 100).toFixed(2)}~~ → **FREE**`,
        image: {
          url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.id}/header.jpg`
        },
        color: 0x00ff00,
        timestamp: new Date().toISOString()
      }));

      await api.channels.createMessage(CHANNEL_ID, {
        content: "🚨 **New Free Steam Games!**",
        embeds
      });
    }

    lastFreeGames = current;

  } catch (err) {
    console.error(err);
  }
}

function extractUrls(text) {
  return text.match(/https?:\/\/\S+/g) || [];
}

function getEmbedVariants(url) {
    if (url.includes("instagram.com") || url.includes("instagram/reel")) {
      return [
        url.replace("instagram.com", "ddinstagram.com"),
        url.replace("instagram.com", "ssinstagram.com"),
        url
      ]
    }

  if (url.includes("twitter.com") || url.includes("x.com")) {
    return [
      url.replace(/(twitter|x)\.com/, "fxtwitter.com"),
      url.replace(/(twitter|x)\.com/, "vxtwitter.com"),
      url
    ];
  }

  if (url.includes("reddit.com")) {
    return [
      url.replace("reddit.com", "rxddit.com"),
      url
    ];
  }

  return [url];
}

//Ouvinte de eventos para quando uma mensagem é criada. Ele verifica se a mensagem foi enviada por um bot e, em seguida, processa o comando. Se o comando for "yt", ele faz uma solicitação à API do YouTube para pesquisar vídeos com base na consulta fornecida e responde com o link do vídeo encontrado. Se a mensagem for "casa cmg?", ele responde com "SIM CASO COM VC".
const client = new Client({rest, gateway});

client.on(GatewayDispatchEvents.MessageCreate, async ({api, data}) => {
  if (data.author.bot) {
    return;
  }

  //Verifica se o conteúdo da mensagem começa com o prefixo definido. Se não começar, ele extrai as URLs do conteúdo da mensagem usando a função extractUrls. Em seguida, ele verifica cada URL para ver se ela pertence a determinados domínios (tenor.com, giphy.com, imgur.com, youtube.com, youtu.be) e, se não pertencer, ele gera variantes de embed para a URL usando a função getEmbedVariants. Depois disso, ele exclui a mensagem original e cria uma nova mensagem com o primeiro embed variante.
  if (!data.content.startsWith(PREFIX)) {
  const urls = extractUrls(data.content);

  if (urls.length > 0) {

    for (let url of urls) {

      if (url.includes("tenor.com")) continue;
      if (url.includes("giphy.com")) continue;
      if (url.includes("imgur.com")) continue;
      if (url.includes("youtube.com")) continue;
      if (url.includes("youtu.be")) continue;

      const variants = getEmbedVariants(url);

      await api.channels.deleteMessage(data.channel_id, data.id);

      await api.channels.createMessage(data.channel_id, {
        content: variants[0]
      });
    }

    return;
  }
}

  const args = data.content.slice(PREFIX.length).trim().split(" ");
  const command = args.shift().toLowerCase();


  if (command === "yt") {
    const query = args.join(" ");
    if (!query) {
        return api.channels.createMessage(data.channel_id, {
            content: "Give me something to search!",
            message_reference: { message_id: data.id },
    });
}
  
//Faz uma solicitação à API do YouTube para pesquisar vídeos com base na consulta fornecida. Ele usa o endpoint de pesquisa da API do YouTube, passando os parâmetros necessários, como a parte "snippet", a consulta de pesquisa, a chave da API, o número máximo de resultados e o tipo de resultado (vídeo). Se um vídeo for encontrado, ele responde com o link do vídeo. Caso contrário, ou se ocorrer um erro durante a pesquisa, ele responde com uma mensagem de erro apropriada.
    try {
      const res = await axios.get(
        `https://www.googleapis.com/youtube/v3/search`,
        {
          params: {
            part: "snippet",
            q: query,
            key: YT_API_KEY,
            maxResults: 1,
            type: "video"
          }
        }
      );


      //Verifica se a resposta da API do YouTube contém resultados. Se não houver resultados, ele responde com uma mensagem indicando que nenhum vídeo foi encontrado. Caso contrário, ele extrai o primeiro vídeo dos resultados e constrói a URL do vídeo usando o ID do vídeo retornado pela API. Em seguida, ele responde com o link do vídeo encontrado.
      const video = res.data.items[0];
      const url = `https://www.youtube.com/watch?v=${video.id.videoId}`;

      await api.channels.createMessage(data.channel_id, {
        content: `${url}`,
        message_reference: { message_id: data.id },
});
    } catch (err) {
      console.error(err);
        await api.channels.createMessage(data.channel_id, {
        content: "Error searching YouTube.",
        message_reference: { message_id: data.id },
});
}
  }

    //Verifica se o conteúdo da mensagem é "casa cmg?" e, se for, responde com "SIM CASO COM VC". A resposta é enviada como uma mensagem referenciando a mensagem original para manter o contexto da conversa.
  if (data.content === 'casa cmg?') {
    await api.channels.createMessage(data.channel_id, {
      content: 'SIM CASO COM VC',
      message_reference: {message_id: data.id},
    });
  }

if (command === "free") {
  await checkFreeGames(api);
}
});

//Ouvinte de eventos para quando o bot estiver pronto. Ele extrai o nome de usuário e o discriminador do bot a partir dos dados recebidos e imprime uma mensagem no console indicando que o bot está logado com sucesso.
client.on(GatewayDispatchEvents.Ready, async ({api, data}) => {
  const {username, discriminator} = data.user;
  console.log(`Logged in as @${username}#${discriminator}`);

  // prevent spam on startup
  lastFreeGames = await getSteamDBStyleFreeGames();

  // run every 30 min
  setInterval(() => {
    checkFreeGames(api);
  }, 1000 * 60 * 30);
});

//Inicia a conexão com o gateway do Fluxer, permitindo que o bot comece a receber eventos e interagir com os usuários.
gateway.connect();