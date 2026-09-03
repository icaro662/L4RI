import youtubedl from 'yt-dlp-exec';
import { log } from './logger.js';

const DOWNLOAD_HEADERS = [
  'User-Agent: Mozilla/5.0',
  'Referer: https://www.instagram.com/',
];
const MAX_CAPTURE_BUFFER = 1024 * 1024 * 512;

function isMp4Payload(buffer) {
  if (!buffer || buffer.length < 12) {
    return false;
  }

  return buffer.toString('ascii', 4, 8) === 'ftyp';
}

export async function getInstagramMediaUrl(url) {
  const { stdout } = await youtubedl.exec(
    url,
    {
      format: 'best[ext=mp4]/best',
      getUrl: true,
      noWarnings: true,
      noCheckCertificates: true,
      addHeader: DOWNLOAD_HEADERS,
      noProgress: true,
      noColor: true,
    },
    {
      encoding: 'utf8',
      stdout: 'pipe',
      stderr: 'pipe',
      maxBuffer: MAX_CAPTURE_BUFFER,
    },
  );

  return stdout.trim();
}

export async function getInstagramMetadata(url) {
  const metadata = await youtubedl(url, {
    dumpSingleJson: true,
    noWarnings: true,
    noCheckCertificates: true,
    addHeader: DOWNLOAD_HEADERS,
    noProgress: true,
    noColor: true,
  });

  return metadata && typeof metadata === 'object' ? metadata : {};
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

export async function downloadInstagramMediaToMemory(url) {
  const directUrl = await getInstagramMediaUrl(url);

  const response = await fetch(directUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
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

export async function downloadInstagramMedia(url) {
  log('InstagramDownloader', 'Downloading Instagram media:', url);
  return downloadInstagramMediaToMemory(url);
}