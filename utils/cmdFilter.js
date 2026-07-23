import uniHandler from "./uniHandler.js";

const DEFAULT_PREFIX = "!";
const DEFAULT_MENTION = "<@1483928797831864671>";

export async function handleCommand(
  message,
  userConversations,
  clients,
  prefix = DEFAULT_PREFIX,
  mention = DEFAULT_MENTION,
) {
  if (message.author.bot) return;

  try {
    if (message.content.startsWith(mention)) {
      try {
        if (message.attachments?.size > 0) {
          const question = message.content.replace(mention, "").trim();
          await uniHandler.handleGrokAnalyze(
            message,
            [question],
            userConversations,
            clients,
          );
        } else {
          const question = message.content.replace(mention, "").trim();
          await uniHandler.handleGrok(message, [question], userConversations, clients);
        }
      } catch (error) {
        console.error("An unexpected error occurred:", error);
      }
    } else if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(" ");
      const command = args.shift().toLowerCase();

      try {
        if (command === "search") {
          await uniHandler.handleSearch(message, args, clients);
        } else if (command === "img") {
          await uniHandler.handleImgSearch(message, args, clients);
        } else if (command === "grok") {
          await uniHandler.handleGrok(message, args, userConversations, clients);
        } else if (command === "analyze") {
          await uniHandler.handleGrokAnalyze(message, args, userConversations, clients);
        } else if (command === "yt" || command === "youtube") {
          await uniHandler.handleYoutube(message, args, clients);
        } else if (command === "checkfree" || command === "check") {
          await uniHandler.handleFreeCheck(message, args, clients);
        } else if (command === "avatar") {
          await uniHandler.handleAvatar(message, args);
        } else if (command === "imagine") {
          await uniHandler.handleImageGen(message, args);
        } else if (command === "canvas") {
          await uniHandler.handleCanvas(message, args, clients);
        } else if (command === "randompedia") {
          await uniHandler.handleWikiRandom(message, args);
        } else if (command === "wiki") {
          await uniHandler.handleWikiSearch(message, args);
        } else if (command === "help") {
          await message.reply({
            ping: false,
            embeds: [
              {
                title: "Comandos disponíveis",
                description: `
                  Comandos de IA Generativa:\n
                
                  @L4RI [imagem] [texto] - Analisa uma imagem\n
                  @L4RI [texto] - Realiza uma pergunta ou inicia uma conversa com a L4RI\n
                  !imagine [texto] - Gera uma imagem com base no texto inputado\n
                        
                  Comandos de busca:\n
                        
                  !search [termo] - Procura algo na web\n
                  !img [termo] - Procura por uma imagem na web\n
                  !yt ou !youtube [termo] - Procura por vídeos no YouTube\n
                  !check ou !checkfree - Verifica jogos grátis (Steam, Epic games)\n
                  !copypasta - Procura por uma copypasta aleatória em r/BrazilianCopypasta\n
                  !wiki [termo] - Procura por um artigo na Wikipedia\n
                  !randompedia - Retorna um artigo aleatório da Wikipedia\n
                  
                  Comandos de utilidade:\n
                  !avatar or !avatar @menção - Retorna seu avatar ou avatar do membro mencionado\n
                  !canvas caption [texto] - Insere um texto em uma imagem\n
                        
                  Outros comandos:\n
                        
                  !help - Mostra essa mensagem de ajuda\n`,
              },
            ],
          });
        }
      } catch (error) {
        console.error("Command error:", error);
      }
    } else if (message.content === "ping") {
      await message.reply({
        ping: false,
        content: "pong",
      });
    } else if (
      message.content.includes("http://") ||
      message.content.includes("https://")
    ) {
      await urlParser(message);
    }
  } catch (err) {
    console.error("Fatal message error:", err);
  }
}
