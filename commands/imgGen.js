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

    let response;
    try {
      response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
      });
    } catch (fetchError) {
      const isTimeout = fetchError.code === 'ECONNABORTED';
      const status = fetchError.response?.status;

      const errorMsg = isTimeout
        ? "Pollinations timed out. The prompt may be too complex, try again."
        : status
        ? `Pollinations returned HTTP ${status}.`
        : `Unexpected error: ${fetchError.message}`;

      return await loadingMessage.edit({
        embeds: [{
          title: "Image generation failed",
          description: errorMsg,
          color: 0xFF0000,
        }]
      });
    }

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
        title: "Image generation failed",
        description: `An unexpected error occurred: \`${error.message}\``,
        color: 0xFF0000,
      }]
    });
  }
}