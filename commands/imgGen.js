import {error as logError} from '../utils/logger.js';
import { createCooldown } from '../utils/cooldown.js';

const IMAGE_GEN_COOLDOWN_MS = 45_000;
const imageGenCooldown = createCooldown(IMAGE_GEN_COOLDOWN_MS);

export async function handleImageGen(message, args) {
  // Step 1: Extract and validate prompt from command arguments.
  const prompt = args.join(" ");

  if (!prompt) {
    return message.reply({
      ping: false,
      content: "Usage: !imagine [your prompt]",
    });
  }

  // Step 2: Block calls that arrive within the global 45s window.
  const { allowed, retryInMs } = imageGenCooldown.take();

  if (!allowed) {
    const seconds = Math.ceil(retryInMs / 1000);

    return message.reply({
      ping: false,
      content: `Geração de imagem em timeout. Por favor, aguarde ${seconds} segundos.`,
    });
  }

  try {
    // Step 3: Send initial progress embed to the channel.
    const loadingMessage = await message.reply({
      ping: false,
      embeds: [{
        title: "Generating image...",
        description: `Prompt: **${prompt}**`,
        color: 0x5865F2,
      }]
    });

    // Step 4: Construct Pollinations AI image URL with encoded prompt.
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

    // Step 5: Edit loading message to present generated image embed.
    await loadingMessage.edit({
      embeds: [{
        title: prompt,
        image: { url: imageUrl },
        color: 0x5865F2,
      }]
    });

  } catch (error) {
    // Step 6: Catch and log unexpected generation errors, reporting failure to user.
    logError('ImgGen', 'Image generation error:', error);
    await message.reply({
      ping: false,
      embeds: [{
        title: "Geração de imagem falhou.",
        description: `Um erro inesperado ocorreu: \`${error.message}\``,
        color: 0xFF0000,
      }]
    });
  }
}
