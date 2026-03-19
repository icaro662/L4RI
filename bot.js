import 'dotenv/config';
import {Client, GatewayDispatchEvents} from '@discordjs/core';
import {REST} from '@discordjs/rest';
import {WebSocketManager} from '@discordjs/ws';
import axios from 'axios';

//Processa a variável de ambiente para o prefixo do comando, a chave da API do YouTube e o token do bot. Se alguma dessas variáveis não estiver definida, o código lançará um erro.
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


//Ouvinte de eventos para quando uma mensagem é criada. Ele verifica se a mensagem foi enviada por um bot e, em seguida, processa o comando. Se o comando for "yt", ele faz uma solicitação à API do YouTube para pesquisar vídeos com base na consulta fornecida e responde com o link do vídeo encontrado. Se a mensagem for "casa cmg?", ele responde com "SIM CASO COM VC".
const client = new Client({rest, gateway});


client.on(GatewayDispatchEvents.MessageCreate, async ({api, data}) => {
  if (data.author.bot) {
    return;
  }


  //Verifica se a mensagem começa com o prefixo definido. Se não começar, o código retorna e não processa a mensagem. Em seguida, ele extrai os argumentos do comando, separando-os por espaços, e identifica o comando principal (o primeiro argumento). O código então verifica se o comando é "yt" e, se for, realiza uma pesquisa no YouTube usando a API para encontrar um vídeo correspondente à consulta fornecida. Se um vídeo for encontrado, ele responde com o link do vídeo. Caso contrário, ou se ocorrer um erro durante a pesquisa, ele responde com uma mensagem de erro apropriada.
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
});

//Ouvinte de eventos para quando o bot estiver pronto. Ele extrai o nome de usuário e o discriminador do bot a partir dos dados recebidos e imprime uma mensagem no console indicando que o bot está logado com sucesso.
client.on(GatewayDispatchEvents.Ready, ({data}) => {
  const {username, discriminator} = data.user;
  console.log(`Logged in as @${username}#${discriminator}`);
});

//Inicia a conexão com o gateway do Fluxer, permitindo que o bot comece a receber eventos e interagir com os usuários.
gateway.connect();