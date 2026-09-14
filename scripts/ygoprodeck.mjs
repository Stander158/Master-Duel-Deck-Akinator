/**
 * Minimal YGOPRODeck API client.
 *
 * API guide: https://ygoprodeck.com/api-guide/
 *
 * Two rules from their terms shape this file:
 *
 *  - Rate limit. They cap clients at 20 requests/second and will block you for
 *    going over, so every call goes through one serialised queue with a gap
 *    between requests. Do not parallelise around it.
 *  - Images. YGOPRODeck asks that you do NOT hotlink their card images —
 *    download them once and serve your own copies. `downloadImage` exists so
 *    the app never points an <img> at their CDN.
 *
 * Both are deliberately conservative. Re-read the guide before loosening them.
 */

const API = 'https://db.ygoprodeck.com/api/v7';
const IMAGE_HOST = 'https://images.ygoprodeck.com/images';

/** Gap between requests. Their limit is 20/s; this is ~8/s. */
const REQUEST_GAP_MS = 120;

const USER_AGENT = 'master-duel-deck-akinator (https://github.com/Stander158/Master-Duel-Deck-Akinator)';

let queue = Promise.resolve();
let lastRequestAt = 0;

/** Serialise every request and keep them spaced out. */
function schedule(task) {
  const run = queue.then(async () => {
    const wait = REQUEST_GAP_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await task();
    } finally {
      lastRequestAt = Date.now();
    }
  });
  // Keep the chain alive even when one task rejects.
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function request(url, { attempts = 4 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await schedule(() =>
        fetch(url, { headers: { Accept: 'application/json', 'User-Agent': USER_AGENT } }),
      );

      // 400 means "no card matched" for cardinfo.php, which is a real answer.
      if (response.status === 400) return null;

      if (response.status === 429 || response.status >= 500) {
        throw new Error(`HTTP ${response.status} from ${url}`);
      }
      if (!response.ok) {
        throw Object.assign(new Error(`HTTP ${response.status} from ${url}`), { fatal: true });
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (error.fatal || attempt === attempts) break;
      const backoff = 500 * 2 ** (attempt - 1);
      console.warn(`  retry ${attempt}/${attempts - 1} in ${backoff}ms — ${error.message}`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }

  throw lastError;
}

/** Every archetype name the database knows about. */
export async function fetchArchetypes() {
  const data = await request(`${API}/archetypes.php`);
  if (!Array.isArray(data)) throw new Error('archetypes.php did not return an array');
  return data.map((entry) => entry.archetype_name).filter(Boolean);
}

/** One card by exact name. Returns null when nothing matches. */
export async function fetchCardByName(name) {
  const data = await request(`${API}/cardinfo.php?name=${encodeURIComponent(name)}`);
  return data?.data?.[0] ?? null;
}

/** Every card belonging to an archetype. */
export async function fetchCardsByArchetype(archetype) {
  const data = await request(`${API}/cardinfo.php?archetype=${encodeURIComponent(archetype)}`);
  return data?.data ?? [];
}

/** Keep only the fields the app renders, so the committed JSON stays small. */
export function slimCard(card) {
  const image = card.card_images?.[0];
  return {
    id: card.id,
    name: card.name,
    type: card.type,
    desc: card.desc,
    ...(card.archetype ? { archetype: card.archetype } : {}),
    ...(card.atk !== undefined ? { atk: card.atk } : {}),
    ...(card.def !== undefined ? { def: card.def } : {}),
    ...(card.level !== undefined ? { level: card.level } : {}),
    ...(card.attribute ? { attribute: card.attribute } : {}),
    ...(card.race ? { race: card.race } : {}),
    ...(image ? { imageId: image.id } : {}),
  };
}

/**
 * Download one card image into `destDir`, skipping it when already present.
 * `variant` is 'small' (168x246), 'cropped' (artwork only) or 'full'.
 */
export async function downloadImage(imageId, destDir, variant = 'small') {
  const { mkdir, writeFile, access } = await import('node:fs/promises');
  const { join } = await import('node:path');

  const folder = { small: 'cards_small', cropped: 'cards_cropped', full: 'cards' }[variant];
  if (!folder) throw new Error(`unknown image variant: ${variant}`);

  await mkdir(destDir, { recursive: true });
  const dest = join(destDir, `${imageId}.jpg`);

  try {
    await access(dest);
    return { path: dest, skipped: true };
  } catch {
    // Not cached yet — fall through and fetch it.
  }

  const response = await schedule(() =>
    fetch(`${IMAGE_HOST}/${folder}/${imageId}.jpg`, { headers: { 'User-Agent': USER_AGENT } }),
  );
  if (!response.ok) throw new Error(`HTTP ${response.status} downloading image ${imageId}`);

  await writeFile(dest, Buffer.from(await response.arrayBuffer()));
  return { path: dest, skipped: false };
}
