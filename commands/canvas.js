import {createCanvas, loadImage, GlobalFonts} from "@napi-rs/canvas";
import { error as logError } from '../utils/logger.js';

GlobalFonts.registerFromPath("utils/impact.ttf","Impact");

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];

  let currentLine = "";

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

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

async function Caption(message, args) {
  let loadingMessage;

  try {
    const attachment =
      message.attachments.first();

    const text = args
      .slice(1)
      .join(" ")
      .toUpperCase();

    // Validate attachment
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

    // Validate extension
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

    // Validate text
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

    // Loading message
    loadingMessage =
      await message.reply({
        ping: false,
        embeds: [{
          title:
            "Generating caption...",
          color: 0x5865F2,
        }]
      });

    const img = await loadImage(
      attachment.url
    );

  
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

    await loadingMessage.delete();

    await message.reply({
      ping: false,
      files: [{
        data: buffer,
        name: "caption.png"
      }]
    });

  } catch (error) {
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

async function Separator(message,args) {
  if (args.includes("caption")) {
    await Caption(message, args);
  }
}

export async function handleCanvas(message,args) {
  await Separator(message, args);
}