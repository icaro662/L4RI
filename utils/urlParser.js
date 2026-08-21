import { createTemporaryInstagramCookieFile } from './instagramSession.js';
import {
  downloadInstagramMedia,
  getInstagramMetadata,
  isInstagramVideoMetadata,
} from './instagramDownloader.js';

function extractUrls(text) {
  return text.match(/https?:\/\/\S+/g) || [];
}

function isLikelyInstagramVideoUrl(url) {
  try {
    const { pathname } = new URL(url);
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length === 0) {
      return false;
    }

    const firstSegment = segments[0].toLowerCase();

    return ['reel', 'tv'].includes(firstSegment);
  } catch {
    return false;
  }
}

function getEmbedVariants(url) {
  if (url.includes('instagram.com') || url.includes('instagram/reel')) {
    return [url];
  }

  if (url.includes('twitter.com') || url.includes('//x.com')) {
    return [
      url.replace(/(twitter|x)\.com/, 'fxtwitter.com'),
      url,
    ];
  }

  return [url];
}

const ERROR_MESSAGE_TIMEOUT_MS = 5000;

async function handleInstagramUrl(message, url, loadingMessage) {
  console.log('Handling Instagram URL:', url);

  try {
    const cookieFilePath = await createTemporaryInstagramCookieFile({
      username: process.env.INSTAGRAM_USERNAME,
      password: process.env.INSTAGRAM_PASSWORD,
    });

    const metadata = await getInstagramMetadata(url, cookieFilePath);

    if (!isInstagramVideoMetadata(metadata)) {
      await loadingMessage?.delete().catch(() => {});
      return;
    }

    const buffer = await downloadInstagramMedia(url, cookieFilePath);

    const title = metadata.title || 'Instagram Post';
    const description = metadata.description || 'No description provided.';
    const account = metadata.uploader || metadata.channel || 'Unknown account';
    const shortenedDescription = description.length > 400
      ? `${description.slice(0, 397)}...`
      : description;

    await loadingMessage?.delete().catch(() => {});

    console.log('Sending Instagram media to Fluxer:');
    await message.send({
      ping: false,
      embeds: [{
        title: `Sent by ${message.author.username}`,
        color: 0x5865F2,
        description: [
          `Description:\n ${shortenedDescription}\n`,
          `URL:\n ${url}`,
        ].join('\n'),
      }],
    });

    await message.send({
      ping: false,
      files: [{
        data: buffer,
        name: 'instagram-media.mp4',
      }],
    });

    console.log('Instagram media sent successfully.');
  } catch (error) {
    console.error('Instagram download failed:', error);

    await loadingMessage?.delete().catch(() => {});

    const errorMessage = await message.send({
      content: 'something went wrong while trying to download the Instagram media. Please try again later.',
    });

    setTimeout(() => {
      errorMessage?.delete().catch(() => {});
    }, ERROR_MESSAGE_TIMEOUT_MS);
  }
}

export async function urlParser(message) {
  if (!message?.content) return;

  if (message.author?.bot) return;

  const urls = extractUrls(message.content);

  console.log('Extracted URLs:', urls);

  const supported = urls.filter(
    (url) =>
      url.includes('instagram.com') ||
      url.includes('twitter.com') ||
      url.includes('//x.com'),
  );

  console.log('Supported:', supported);

  if (supported.length === 0) return;

  await message.delete(message.channel_id, message.id).catch(() => {});

  for (const url of supported) {
    console.log('Processing URL:', url);
    const variants = getEmbedVariants(url);

    if (url.includes('instagram.com') || url.includes('instagram/reel')) {
      if (!isLikelyInstagramVideoUrl(url)) {
        console.log('Skipping non-video Instagram URL at parser entrypoint:', url);
        continue;
      }

      const loadingMessage = await message.send({
        ping: false,
        content: 'Downloading instagram media...',
      });

      await handleInstagramUrl(message, url, loadingMessage);
      continue;
    }

    await message.send({
      content: `${variants[0]}\nby ${message.author.username}`,
    });
  }
}
