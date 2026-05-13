import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

GlobalFonts.registerFromPath("utils/impact.ttf", 'Impact');

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const { width } = ctx.measureText(testLine);

    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

async function Caption(message, args) {
  try {
    const attachment = message.attachments.first();
    const text = args.slice(1).join(" ").toUpperCase();

    if (!attachment?.size > 0) {
      return await message.reply({
        ping: false,
        embeds: [{ description: 'No image found. Please insert a image.' }]
      });
    }

    const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
    const url = attachment.url.split('?')[0];
    const isImage = validExtensions.some(ext => url.endsWith(ext));

    if (!attachment || !isImage) {
      return await message.reply({
        ping: false,
        embeds: [{ description: 'Invalid image format.' }]
      });
    }

    if (!text) {
      return await message.reply({
        ping: false,
        embeds: [{ description: 'No text found. Please insert a text.' }]
      });
    }

    const img = await loadImage(attachment.url);
    const fontSize = Math.round(img.width * 0.07);
    const lineHeight = fontSize * 1.3;
    const padding = Math.round(img.width * 0.03);
    const maxTextWidth = img.width - padding * 2;

    // Measure lines using a temp canvas
    const tempCanvas = createCanvas(img.width, 100);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `300 ${fontSize}px Impact`;
    const lines = wrapText(tempCtx, text, maxTextWidth);

    const captionHeight = Math.round(lines.length * lineHeight + padding * 2);
    const canvas = createCanvas(img.width, img.height + captionHeight);
    const ctx = canvas.getContext('2d');

    // Draw white caption box
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, img.width, captionHeight);

    // Draw image below caption
    ctx.drawImage(img, 0, captionHeight);

    // Draw each line of text
    ctx.fillStyle = 'black';
    ctx.font = `300 ${fontSize}px Impact`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    lines.forEach((line, i) => {
      ctx.fillText(line, img.width / 2, padding + i * lineHeight);
    });

    const buffer = canvas.toBuffer('image/png');

    await message.reply({
      ping: false,
      files: [{ data: buffer, name: 'caption.png' }]
    });

  } catch {
    return message.reply({
      ping: false,
      embeds: [{ description: 'mb g someshit went wrongs while processing yo request, yo.' }]
    });
  }
}

async function Separator(message, args) {
  if (args.includes("caption")) {
    await Caption(message, args);
  }
}

export async function handleCanvas(message, args) {
  await Separator(message, args);
}