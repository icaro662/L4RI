import { error as logError } from '../utils/logger.js';

const IMAGE_GEN_URL_BASE = 'https://image.pollinations.ai/prompt';

// Pollinations' free tier allows one image at a time, at least 45s apart per IP.
const IMAGE_WAIT_MS = 45_000;
const IMAGE_POLL_INTERVAL_MS = 2_000;
const DEFAULT_RETRY_IN_MS = 45_000;

// The free tier has a single slot per IP, so parallel generations would just
// fight over it. Allow one at a time and reject the rest immediately.
let generationInFlight = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads a `Retry-After` header, which may be either seconds or an HTTP date.
 *
 * @param {string|null} headerValue
 * @returns {number|null} Delay in milliseconds, or null when absent/invalid.
 */
function parseRetryAfterMs(headerValue) {
  if (!headerValue) return null;

  const seconds = Number(headerValue);

  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1000);
  }

  const date = Date.parse(headerValue);

  if (!Number.isNaN(date)) {
    return Math.max(0, date - Date.now());
  }

  return null;
}

async function discardBody(response) {
  try {
    await response.body?.cancel();
  } catch {
    // Body already consumed or connection closed; nothing to clean up.
  }
}

/**
 * Polls the Pollinations image URL until it returns an actual image.
 *
 * A 200 alone is not enough: while the per-IP slot is unavailable the API
 * answers 402/429 with a JSON body, and Fluxer would embed that as a broken
 * image. Only `200 + image/*` counts as ready. In that case the body is read to
 * completion so the image is cached before the embed URL is handed to Fluxer.
 *
 * Rate-limit responses (402/429) are surfaced immediately with their
 * `Retry-After`, while transient errors (5xx, network, timeouts) are retried
 * until the overall budget is spent.
 *
 * @param {string} url
 * @returns {Promise<{ ready: boolean, retryInMs: number }>}
 */
async function waitForImage(url) {
  const deadline = Date.now() + IMAGE_WAIT_MS;
  let retryInMs = null;

  while (true) {
    const remaining = deadline - Date.now();

    if (remaining <= 0) {
      return { ready: false, retryInMs: retryInMs ?? DEFAULT_RETRY_IN_MS };
    }

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(remaining),
      });

      const contentType = response.headers.get('content-type') ?? '';

      if (response.ok && contentType.startsWith('image/')) {
        await response.arrayBuffer();
        return { ready: true, retryInMs: 0 };
      }

      retryInMs = parseRetryAfterMs(response.headers.get('retry-after'));
      await discardBody(response);

      // The free slot is closed: fail fast and let the caller tell the user
      // when to try again instead of polling through the whole window.
      if (response.status === 402 || response.status === 429) {
        return { ready: false, retryInMs: retryInMs ?? DEFAULT_RETRY_IN_MS };
      }
    } catch {
      // Network error or attempt timeout: retry until the budget runs out.
      retryInMs = null;
    }

    const delay = Math.min(
      retryInMs ?? IMAGE_POLL_INTERVAL_MS,
      Math.max(0, deadline - Date.now()),
    );

    await wait(delay > 0 ? delay : IMAGE_POLL_INTERVAL_MS);
    retryInMs = null;
  }
}

export async function handleImageGen(message, args) {
  // Step 1: Extract and validate prompt from command arguments.
  const prompt = args.join(" ");

  if (!prompt) {
    return message.reply({
      ping: false,
      content: "Usage: !imagine [your prompt]",
    });
  }

  // Step 2: Reject concurrent calls while a generation is already running.
  if (generationInFlight) {
    return message.reply({
      ping: false,
      content: "Já existe uma geração de imagem em andamento. Aguarde...",
    });
  }

  generationInFlight = true;

  let loadingMessage;

  try {
    // Step 3: Send initial progress embed to the channel.
    loadingMessage = await message.reply({
      ping: false,
      embeds: [{
        title: "Gerando imagem...",
        description: `Prompt: **${prompt}**`,
        color: 0x5865F2,
      }]
    });

    // Step 4: Construct Pollinations AI image URL with encoded prompt.
    const imageUrl = `${IMAGE_GEN_URL_BASE}/${encodeURIComponent(prompt)}`;

    // Step 5: Wait until the URL actually serves an image (see waitForImage).
    const { ready, retryInMs } = await waitForImage(imageUrl);

    if (!ready) {
      const seconds = Math.ceil(retryInMs / 1000);

      return await loadingMessage.edit({
        embeds: [{
          title: "Geração de imagem em intervalo.",
          description: `A API está no intervalo entre gerações. Por favor, tente novamente em ${seconds} segundos.`,
          color: 0xFF0000,
        }]
      });
    }

    // Step 6: Edit loading message to present the now-cached image embed.
    await loadingMessage.edit({
      embeds: [{
        title: prompt,
        image: { url: imageUrl },
        color: 0x5865F2,
      }]
    });

  } catch (error) {
    // Step 7: Catch and log unexpected generation errors, reporting failure to user.
    logError('ImgGen', 'Image generation error:', error);

    const failureEmbed = {
      title: "Geração de imagem falhou.",
      description: `Um erro inesperado ocorreu: \`${error.message}\``,
      color: 0xFF0000,
    };

    if (loadingMessage) {
      // Replace the progress embed instead of leaving it stuck forever.
      await loadingMessage.edit({ embeds: [failureEmbed] }).catch(() => {});
      return;
    }

    await message.reply({ ping: false, embeds: [failureEmbed] });
  } finally {
    generationInFlight = false;
  }
}
