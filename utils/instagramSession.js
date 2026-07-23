import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

function cookiesToNetscape(cookies = []) {
  const lines = ['# Netscape HTTP Cookie File'];

  for (const cookie of cookies) {
    lines.push(
      [
        cookie.domain || '',
        cookie.hostOnly ? 'FALSE' : 'TRUE',
        cookie.path || '/',
        cookie.secure ? 'TRUE' : 'FALSE',
        cookie.expires || 0,
        cookie.name || '',
        cookie.value || '',
      ].join('\t'),
    );
  }
  console.log('Cookies converted to Netscape format:\n', lines.join('\n'));
  return `${lines.join('\n')}\n`;
}

function hasInstagramSessionCookies(cookies = []) {
  return cookies.some(
    (cookie) => cookie.name === 'sessionid' || cookie.name === 'ds_user_id',
  );
}

function hasAnyInstagramCookies(cookies = []) {
  return cookies.length > 0;
}

async function tryFillInstagramCredentials(page, username, password) {
  const usernameCandidates = [
    page.locator('input[name="username"]'),
    page.locator('input[autocomplete="username"]'),
    page.locator('input[aria-label*="username"], input[aria-label*="email"]'),
    page.locator('input[placeholder*="username"], input[placeholder*="email"]'),
  ];

  const passwordCandidates = [
    page.locator('input[name="password"]'),
    page.locator('input[autocomplete="current-password"]'),
    page.locator('input[aria-label*="password"]'),
    page.locator('input[placeholder*="password"]'),
  ];

  let usernameInput = null;
  let passwordInput = null;

  for (const candidate of usernameCandidates) {
    if (await candidate.count()) {
      usernameInput = candidate.first();
      break;
    }
  }

  for (const candidate of passwordCandidates) {
    if (await candidate.count()) {
      passwordInput = candidate.first();
      break;
    }
  }

  if (!usernameInput || !passwordInput) {
    return false;
  }

  await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
  await passwordInput.waitFor({ state: 'visible', timeout: 10000 });

  await usernameInput.fill(username);
  await passwordInput.fill(password);

  const submitButton = page.locator(
    'button[type="submit"], button:has-text("Log in"), button:has-text("Log In")',
  );

  if (await submitButton.count()) {
    await submitButton.first().click();
  }

  await page.waitForLoadState('networkidle');
  return true;
}

export async function createTemporaryInstagramCookieFile({
  headless = true,
  username = process.env.INSTAGRAM_USERNAME,
  password = process.env.INSTAGRAM_PASSWORD,
} = {}) {
  const browser = await chromium.launch({
    headless,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const context = await browser.newContext({
      userAgent: USER_AGENT,
    });

    const page = await context.newPage();

    await page.goto('https://www.instagram.com/accounts/login/', {
      waitUntil: 'domcontentloaded',
    });

    if (username && password) {
      const filled = await tryFillInstagramCredentials(page, username, password);

      if (!filled) {
        console.log('[instagramSession] Instagram login form did not expose the expected fields. Falling back to manual browser login.');
        await page.waitForTimeout(15000);
      }
    } else {
      console.log('[instagramSession] INSTA_USERNAME / INSTA_PASSWORD not found. Complete the Instagram login in the browser session, then continue.');
      await page.waitForTimeout(15000);
    }

    const cookies = await context.cookies('https://www.instagram.com');
    await context.close();

    if (!hasAnyInstagramCookies(cookies)) {
      throw new Error('Instagram session did not yield any usable cookies.');
    }

    if (!hasInstagramSessionCookies(cookies)) {
      console.warn(
        '[instagramSession] No authenticated session cookies were found. Continuing with a best-effort public cookie file.',
      );
    }

    const cookieFilePath = path.join(
      os.tmpdir(),
      `instagram-${Date.now()}.txt`,
    );

    await fs.writeFile(cookieFilePath, cookiesToNetscape(cookies), 'utf8');
    console.log('Temporary Instagram cookie file created at:', cookieFilePath);
    return cookieFilePath;
  } finally {
    console.log('Closing browser session...');
    await browser.close();
  }
}

export async function cleanupTemporaryCookieFile(cookieFilePath) {
  if (!cookieFilePath) return;

  await fs.unlink(cookieFilePath).catch(() => {});
}
