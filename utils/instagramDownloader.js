import youtubedl from 'yt-dlp-exec';
import { log } from './logger.js';

const MAX_CAPTURE_BUFFER = 1024 * 1024 * 512;

function sanitizeInstagramUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return rawUrl.split('?')[0];
  }
}

function buildYtDlpOptions(extraOptions = {}) {
  const options = {
    noWarnings: true,
    noCheckCertificates: true,
    noProgress: true,
    noColor: true,
    sleepRequests: 1.5,
    ...extraOptions,
  };

  return options;
}

function isMp4Payload(buffer) {
  if (!buffer || buffer.length < 12) {
    return false;
  }

  return buffer.toString('ascii', 4, 8) === 'ftyp';
}

function extractDirectMp4Url(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  if (metadata.url && metadata.ext === 'mp4') {
    return metadata.url;
  }

  if (Array.isArray(metadata.request_formats)) {
    const mp4Req = metadata.request_formats.find((f) => f.ext === 'mp4' && f.url);
    if (mp4Req) return mp4Req.url;
  }

  if (Array.isArray(metadata.formats)) {
    const mp4Formats = metadata.formats.filter(
      (f) => f.ext === 'mp4' && f.url && f.vcodec !== 'none' && f.acodec !== 'none'
    );
    if (mp4Formats.length > 0) {
      return mp4Formats[mp4Formats.length - 1].url;
    }
  }

  return metadata.url || null;
}

export async function getInstagramMetadata(url) {
  const cleanUrl = sanitizeInstagramUrl(url);

  const metadata = await youtubedl(
    cleanUrl,
    buildYtDlpOptions({
      dumpSingleJson: true,
      format: 'best[ext=mp4]/best',
    }),
    {
      maxBuffer: MAX_CAPTURE_BUFFER,
    }
  );

  return metadata && typeof metadata === 'object' ? metadata : {};
}

export async function getInstagramMediaUrl(url) {
  const metadata = await getInstagramMetadata(url);
  const directUrl = extractDirectMp4Url(metadata);

  if (!directUrl) {
    throw new Error('Could not resolve a direct media URL from Instagram metadata.');
  }

  return directUrl;
}

export function isInstagramVideoMetadata(metadata = {}) {
  if (!metadata || typeof metadata !== 'object') {
    return false;
  }

  if (metadata.ext === 'mp4') {
    return true;
  }

  if (Array.isArray(metadata.formats) && metadata.formats.length > 0) {
    return true;
  }

  if (Array.isArray(metadata.request_formats) && metadata.request_formats.length > 0) {
    return true;
  }

  return false;
}

export async function downloadInstagramMediaToMemory(url, existingMetadata = null) {
  const metadata = existingMetadata || (await getInstagramMetadata(url));
  const directUrl = extractDirectMp4Url(metadata);

  if (!directUrl) {
    throw new Error('Instagram media fetch failed: No direct MP4 URL found in metadata.');
  }

  const response = await fetch(directUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Referer: 'https://www.instagram.com/',
    },
  });

  if (!response.ok) {
    throw new Error(`Instagram media fetch failed: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (!isMp4Payload(buffer)) {
    throw new Error(`Instagram media fetch failed: Invalid MP4 payload. Buffer length: ${buffer.length}`);
  }

  return buffer;
}

export async function downloadInstagramMedia(url, existingMetadata = null) {
  log('InstagramDownloader', 'Downloading Instagram media:', url);
  return downloadInstagramMediaToMemory(url, existingMetadata);
}
