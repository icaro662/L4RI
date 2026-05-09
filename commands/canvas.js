import { createCanvas, loadImage } from "@napi-rs/canvas";

async function Caption(message, args) {
    try {
        const attachment = message.attachments.first();
        const text = args.slice(1).join(" ");


        if (!attachment?.size > 0) {
            return await message.reply({
                embeds: [{description:'No image found. Please insert a image.'}]
            })
        } 

        const validExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
        const url = attachment.url.split('?')[0]; // strip query params Discord adds
        const isImage = validExtensions.some(ext => url.endsWith(ext));

        if (!attachment || !isImage) {
            return await message.reply({ 
                embeds: [{description: 'Invalid image format.'}]
            });
        } 
        
        if (!text) {
            return await message.reply({
                embeds: [{description: 'No text found. Please insert a text.'}]
            })
        }
    
        const img = await loadImage(attachment.url)
        const captionHeight = Math.round(img.width * 0.12); // 12% of image width
        const fontSize = Math.round(captionHeight * 0.6);
        const canvas = createCanvas(img.width, img.height + captionHeight);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, captionHeight);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, img.width, captionHeight);
        ctx.fillStyle = 'black';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, img.width / 2, captionHeight / 2, img.width - 20);

        const buffer = canvas.toBuffer('image/png');

        await message.reply({
            files: [{data: buffer, name: 'caption.png'}]
        });
    } catch {
        
        return message.reply({
            embeds:[{description: 'mb g someshit went wrongs while processing yo request, yo.'}]
        })
    }
}


async function Separator(message, args) {

    if (args.includes("caption")) {
        await Caption(message, args)
    }
}


export async function handleCanvas(message, args) {

    await Separator(message, args)
}