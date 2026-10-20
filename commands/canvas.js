import {createCanvas, loadImage, GlobalFonts} from "@napi-rs/canvas";
import { error as logError } from '../utils/logger.js';

GlobalFonts.registerFromPath("utils/impact.ttf","Impact");

/**
 * Splits a text string into an array of wrapped lines such that no line exceeds
 * the specified pixel width on the provided canvas rendering context.
 *
 * Flow:
 * 1. Text Tokenization: Splits input text by spaces into individual words and initializes line buffers.
 * 2. Iterative Measurement: Iterates through each word, measuring candidate line length using `ctx.measureText`.
 * 3. Line Wrapping: If the candidate line exceeds `maxWidth` and the current line is non-empty, commits the current line and starts a new line with the current word; otherwise appends the word.
 * 4. Remainder Flushing: Appends any remaining buffer text to the lines array.
 * 5. Return: Returns the resulting array of wrapped line strings.
 *
 * @param {Object} ctx - Canvas 2D rendering context providing `measureText` calculation.
 * @param {string} text - Raw input text string to be wrapped.
 * @param {number} maxWidth - Maximum allowed width in pixels per line.
 * @returns {string[]} Array of wrapped line strings.
 */
function wrapText(ctx, text, maxWidth) {
  // Step 1: Tokenize input text into words and initialize line storage.
  const words = text.split(" ");
  const lines = [];

  let currentLine = "";

  // Step 2: Iterate over words, measuring line width and wrapping when exceeding maxWidth.
  for (const word of words) {
    const testLine = currentLine
      ? `${currentLine} ${word}`
      : word;

    const { width } =
      ctx.measureText(testLine);

    if (
      width > maxWidth &&
      currentLine
    ) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  // Step 3: Append any remaining text buffer as the final line.
  if (currentLine) {
    lines.push(currentLine);
  }

  // Step 4: Return wrapped lines array.
  return lines;
}

/**
 * Generates a captioned meme image by drawing a top white banner with centered Impact text
 * above the user's attached image.
 *
 * Flow:
 * 1. Input Extraction: Retrieves the first attached file from `message.attachments` and joins `args.slice(1)` into an uppercase caption string.
 * 2. Attachment Validation: Verifies that an attachment exists and has size > 0. If invalid, responds with HTTP 400 Bad Request embed and returns.
 * 3. File Extension Validation: Ensures the attachment URL ends with a supported image extension (.png, .jpg, .jpeg, .gif, .webp). If unsupported, returns HTTP 415 embed.
 * 4. Text Validation: Ensures non-empty caption text was supplied. If missing, responds with HTTP 400 Bad Request embed and returns.
 * 5. Status Feedback: Sends a "Generating caption..." loading embed to the channel.
 * 6. Image Loading: Loads the source image via `loadImage(attachment.url)`.
 * 7. Layout Calculation: Computes scaling (2x), font size relative to image width, line height, padding, and max text width.
 * 8. Text Measurement: Uses a temporary canvas context with Impact font to wrap caption text via `wrapText` and compute required banner height.
 * 9. Canvas Rendering: Instantiates high-res scaled canvas, renders white top banner, draws base image below banner, and prints centered uppercase lines.
 * 10. Buffer Generation & Validation: Converts canvas to PNG buffer and verifies buffer integrity (size >= 1000 bytes).
 * 11. Delivery & Cleanup: Deletes the loading message and replies with the generated `caption.png` file attachment.
 * 12. Error Handling: Catches processing errors, logs them via `logError`, cleans up pending loading message, and replies with an error embed.
 *
 * @param {Object} message - Fluxer message object containing attachments and reply methods.
 * @param {string[]} args - Command arguments array where index 0 is subcommand ('caption') and remainder is caption text.
 * @returns {Promise<Object|void>} Resolves when the caption process completes or early returns on validation failure.
 */
async function Caption(message, args) {
  let loadingMessage;

  try {
    // Step 1: Extract attachment and caption text from command inputs.
    const attachment =
      message.attachments.first();

    const text = args
      .slice(1)
      .join(" ")
      .toUpperCase();

    // Step 2: Validate attachment presence and size.
    if (
      !attachment ||
      attachment.size <= 0
    ) {
      return await message.reply({
        ping: false,
        embeds: [{
          title: "400 Bad Request",
          description:
            "No image attachment found.",
          color: 0xFF0000,
        }]
      });
    }

    // Step 3: Validate file extension against allowed image types.
    const validExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".webp"
    ];

    const url =
      attachment.url.split("?")[0];

    const isImage =
      validExtensions.some(ext =>
        url.endsWith(ext)
      );

    if (!attachment || !isImage) {
      return await message.reply({
        ping: false,
        embeds: [{
          title: "415 Unsupported Media Type",
          description:
            "Invalid image format.",
          color: 0xFF0000,
        }]
      });
    }

    // Step 4: Validate presence of caption text.
    if (!text) {
      return await message.reply({
        ping: false,
        embeds: [{
          title: "400 Bad Request",
          description:
            "No caption text provided.",
          color: 0xFF0000,
        }]
      });
    }

    // Step 5: Send temporary loading status embed.
    loadingMessage =
      await message.reply({
        ping: false,
        embeds: [{
          title:
            "Generating caption...",
          color: 0x5865F2,
        }]
      });

    // Step 6: Load image from attachment URL.
    const img = await loadImage(
      attachment.url
    );

    // Step 7: Calculate canvas typography and layout metrics.
    const scale = 2;

    const fontSize = Math.round(
      img.width * 0.08
    );

    const lineHeight =
      fontSize * 1.3;

    const padding = Math.round(
      img.width * 0.03
    );

    const maxTextWidth =
      img.width - padding * 2;

    // Step 8: Measure and wrap caption text using a temporary canvas.
    const tempCanvas =
      createCanvas(img.width, 100);

    const tempCtx =
      tempCanvas.getContext("2d");

    tempCtx.font =
      `300 ${fontSize}px Impact`;

    const lines = wrapText(
      tempCtx,
      text,
      maxTextWidth
    );

    const captionHeight =
      Math.round(
        lines.length *
          lineHeight +
        padding * 2
      );

    const finalWidth =
      img.width * scale;

    const finalHeight =
      (img.height +
        captionHeight) *
      scale;

    // Step 9: Render canvas banner, scaled base image, and centered caption text.
    const canvas = createCanvas(
      finalWidth,
      finalHeight
    );

    const ctx =
      canvas.getContext("2d");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality =
      "high";

    ctx.fillStyle = "white";

    ctx.fillRect(
      0,
      0,
      finalWidth,
      captionHeight * scale
    );

    ctx.drawImage(
      img,
      0,
      captionHeight * scale,
      img.width * scale,
      img.height * scale
    );

    ctx.fillStyle = "black";

    ctx.font =
      `300 ${fontSize * scale}px Impact`;

    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    lines.forEach((line, i) => {
      ctx.fillText(
        line,
        finalWidth / 2,
        (padding +
          i * lineHeight) *
          scale
      );
    });

    // Step 10: Convert canvas to PNG buffer and validate size.
    const buffer =
      canvas.toBuffer("image/png");

    if (
      !buffer ||
      buffer.length < 1000
    ) {
      throw new Error(
        "INVALID_RENDER"
      );
    }

    // Step 11: Delete loading message and send generated image file.
    await loadingMessage.delete();

    await message.reply({
      ping: false,
      files: [{
        data: buffer,
        name: "caption.png"
      }]
    });

  } catch (error) {
    // Step 12: Catch and log unexpected errors, ensuring loading message cleanup.
    logError('Canvas', 'Canvas command error:', error);

    if (loadingMessage) {
      await loadingMessage
        .delete()
        .catch(() => {});
    }

    return message.reply({
      ping: false,
      embeds: [{
        title:
          "Something went wrong while processing your request",
        color: 0xFF0000,
      }]
    });
  }
}

/**
 * Subcommand router for the canvas module, dispatching commands to specific canvas generators.
 *
 * Flow:
 * 1. Checks if `args` array includes the "caption" subcommand.
 * 2. If matched, delegates execution to `Caption(message, args)`.
 *
 * @param {Object} message - Fluxer message object.
 * @param {string[]} args - Command arguments array.
 * @returns {Promise<void>} Resolves when the matched subcommand handler completes.
 */
async function Separator(message,args) {
  // Step 1: Inspect arguments and route to appropriate canvas subcommand handler.
  if (args.includes("caption")) {
    await Caption(message, args);
  }
}

/**
 * Entry point for the `!canvas` command handler.
 *
 * Flow:
 * 1. Forwards incoming message and argument parameters to `Separator` for subcommand routing.
 *
 * @param {Object} message - Fluxer message object.
 * @param {string[]} args - Command arguments array.
 * @returns {Promise<void>} Resolves when canvas command processing finishes.
 */
export async function handleCanvas(message,args) {
  // Step 1: Forward request to the canvas subcommand separator.
  await Separator(message, args);
}