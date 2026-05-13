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

    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 60000, // 60s timeout, pollinations can be slow
    });

    const buffer = Buffer.from(response.data);

    await loadingMessage.delete();

    await message.reply({
      ping: false,
      embeds: [{
        title: prompt,
        image: { url: 'attachment://generated.png' },
        color: 0x5865F2,
      }],
      files: [{ data: buffer, name: 'generated.png' }]
    });

  } catch (error) {
    console.error(error);
    await message.reply({
      ping: false,
      embeds: [{
        title: "Sorry, an error occurred while generating the image.",
      }]
    });
  }
}