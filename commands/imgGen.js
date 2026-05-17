import axios from 'axios';

export async function handleImageGen(message, args) {
  const prompt = args.join(" ");

  if (!prompt) {
    return message.reply({
      ping: false,
      content: "Usage: !imagine [your prompt]",
    });
  }

  try {
    const loadingMessage = await message.reply({
      ping: false,
      embeds: [{
        title: "Generating image...",
        description: `Prompt: **${prompt}**`,
        color: 0x5865F2,
      }]
    });

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

    await loadingMessage.edit({
      embeds: [{
        title: prompt,
        image: { url: imageUrl },
        color: 0x5865F2,
      }]
    });

  } catch (error) {
    console.error(error);
    await message.reply({
      ping: false,
      embeds: [{
        title: "Image generation failed",
        description: `An unexpected error occurred: \`${error.message}\``,
        color: 0xFF0000,
      }]
    });
  }
}