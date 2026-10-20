import { error as logError } from '../utils/logger.js';

import axios from 'axios';

/**
 * Generates an AI-rendered image based on a user-provided text prompt using Pollinations.ai.
 *
 * Flow:
 * 1. Prompt Assembly: Joins `args` tokens by space into a single prompt string.
 * 2. Validation: If the resulting prompt is empty, sends a usage guide reply and exits.
 * 3. Progress Embed: Sends an initial "Generating image..." status embed to inform the user.
 * 4. Image URL Construction: Builds the Pollinations API endpoint URL with URI-encoded prompt text.
 * 5. Embed Update: Edits the pending status message, attaching the generated image URL in a rich embed.
 * 6. Error Handling: Catches any errors, logs them using `logError`, and replies with an error embed.
 *
 * @param {Object} message - Fluxer message object.
 * @param {string[]} args - Command arguments forming the text prompt for image generation.
 * @returns {Promise<Object|void>} Resolves when the image message is sent or on validation failure.
 */
export async function handleImageGen(message, args) {
  // Step 1: Extract and validate prompt from command arguments.
  const prompt = args.join(" ");

  if (!prompt) {
    return message.reply({
      ping: false,
      content: "Usage: !imagine [your prompt]",
    });
  }

  try {
    // Step 2: Send initial progress embed to the channel.
    const loadingMessage = await message.reply({
      ping: false,
      embeds: [{
        title: "Generating image...",
        description: `Prompt: **${prompt}**`,
        color: 0x5865F2,
      }]
    });

    // Step 3: Construct Pollinations AI image URL with encoded prompt.
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

    // Step 4: Edit loading message to present generated image embed.
    await loadingMessage.edit({
      embeds: [{
        title: prompt,
        image: { url: imageUrl },
        color: 0x5865F2,
      }]
    });

  } catch (error) {
    // Step 5: Catch and log unexpected generation errors, reporting failure to user.
    logError('ImgGen', 'Image generation error:', error);
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