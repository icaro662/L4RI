import {
  downloadInstagramMedia,
  getInstagramMetadata,
  isInstagramVideoMetadata,
} from './instagramDownloader.js';
import { error as logError, log } from './logger.js';

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

    return ['reels','reel', 'tv'].includes(firstSegment);
  } catch {
    return false;
  }
}

function getEmbedVariants(url) {

  if (url.includes('instagram.com') || url.includes('instagram/reels') || url.includes('instagram/reel') || url.includes('instagram/tv')) {
    return [url]
  }

  if (url.includes('twitter.com') || url.includes('//x.com')) {
    return [
      url.replace(/(twitter|x)\.com/, 'fxtwitter.com'),
      url,
    ];
  }

  return [url];
}

const ERROR_MESSAGE_TIMEOUT_MS = 5000; // 5 seconds

async function handleInstagramUrl(message, url, loadingMessage) {
  log('UrlParser', 'Handling Instagram URL:', url);

  try {
    const metadata = await getInstagramMetadata(url);

    if (!isInstagramVideoMetadata(metadata)) {
      await loadingMessage?.delete().catch(() => {});
      return;
    }

    const buffer = await downloadInstagramMedia(url);

    const title = metadata.title || 'Instagram Post';
    const description = metadata.description || 'No description provided.';
    const account = metadata.uploader || metadata.channel || 'Unknown account';
    const shortenedDescription = description.length > 400
      ? `${description.slice(0, 397)}...`
      : description;

    await loadingMessage?.delete().catch(() => {});

    log('UrlParser', 'Sending Instagram media to Fluxer...');
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

    log('UrlParser', 'Instagram media sent successfully.');
  } catch (error) {
    logError('UrlParser', 'Instagram download failed:', error);

    await loadingMessage?.delete().catch(() => {});

    const errorMessage = await message.send({
      content: 'Something went wrong while trying to download the Instagram media. Please try again later.',
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

  log('UrlParser', 'Extracted URLs:', urls);

  const supported = urls.filter(
    (url) =>
      url.includes('instagram.com') ||
      url.includes('twitter.com') ||
      url.includes('//x.com'),
  );

  log('UrlParser', 'Supported:', supported);

  if (supported.length === 0) return;

  await message.delete(message.channel_id, message.id).catch(() => {});

  for (const url of supported) {
    log('UrlParser', 'Processing URL:', url);
    const variants = getEmbedVariants(url);

    if (url.includes('instagram.com') || url.includes('instagram/reels') || url.includes('instagram/reel') || url.includes('instagram/tv')) {
      if (!isLikelyInstagramVideoUrl(url)) {
        log('UrlParser', 'Skipping non-video Instagram URL at parser entrypoint:', url);
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
