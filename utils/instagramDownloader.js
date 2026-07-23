import fs from 'node:fs/promises';
import youtubedl from 'yt-dlp-exec';
import { cleanupTemporaryCookieFile } from './instagramSession.js';

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

async function getCookieHeader(cookieFilePath) {
  const content = await fs.readFile(cookieFilePath, 'utf8');
  const cookieEntries = [];

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const columns = trimmed.split('\t');

    if (columns.length < 7) {
      continue;
    }

    const [, , , , , name, value] = columns;

    if (!name || !value) {
      continue;
    }

    cookieEntries.push(`${name}=${value}`);
  }

  return cookieEntries.join('; ');
}

export async function getInstagramMediaUrl(url, cookieFilePath) {
  const { stdout } = await youtubedl.exec(
    url,
    {
      format: 'best[ext=mp4]/best',
      getUrl: true,
      cookies: cookieFilePath,
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

export async function getInstagramMetadata(url, cookieFilePath) {
  const metadata = await youtubedl(url, {
    dumpSingleJson: true,
    cookies: cookieFilePath,
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

export async function downloadInstagramMediaToMemory(url, cookieFilePath) {
  const directUrl = await getInstagramMediaUrl(url, cookieFilePath);
  const cookieHeader = await getCookieHeader(cookieFilePath);

  const response = await fetch(directUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://www.instagram.com/',
      Cookie: cookieHeader,
    },
  });

  if (!response.ok) {
    throw new Error(`Direct media fetch failed with status ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (!isMp4Payload(buffer)) {
    throw new Error('Downloaded Instagram payload is not a valid MP4 stream.');
  }

  return buffer;
}

export async function downloadInstagramMedia(url, cookieFilePath) {
  console.log('Downloading Instagram media:', url);
  try {
    return await downloadInstagramMediaToMemory(url, cookieFilePath);
  } finally {
    await cleanupTemporaryCookieFile(cookieFilePath);
  }
}