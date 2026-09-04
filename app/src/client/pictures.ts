import { env, logger } from '../config.js';
import type { BusinessRepository } from '../store.js';
import { recordSpend } from './spend.js';
import type { AnswerImage } from './schemas.js';

/**
 * What a fence looks like, from a live image search.
 *
 * "Show me colorbond", "what does treated pine look like", "what colours does it come in" - the
 * prose answer in `askAbout.ts` is the wrong tool for every one of those. A paragraph describing a
 * colour is a worse answer than the colour, and a customer choosing between six fence types they
 * have never heard the names of is choosing blind.
 *
 * Nothing here is stored and nothing here is ours. These are photos on other people's sites, found
 * fresh each time, which is exactly what was asked for: the customer wants an idea of how it looks,
 * not a catalogue we maintain. So `sourceName` travels with every one of them - what they are
 * looking at is an example off the web, never a job this marketplace did.
 *
 * Same shape as every other reach outside the process (`geocode.ts`, `askAbout.ts`): gated on
 * config, cached, hard timeout, and a failure returns nothing rather than taking the turn down.
 *
 * It decides nothing. A picture is never an option, never a checklist value and never a price - the
 * same rule the web rate figures live under, and for the same reason (`CONTEXT.md` §1, §7).
 */

const SERPER_IMAGES = 'https://google.serper.dev/images';

/**
 * One image search, USD. Serper bills a credit per search of up to ten results, and a credit is
 * $0.30-$1.00 per thousand depending on the pack - recorded at the top of that range, because a
 * spend ceiling that guesses low is not a ceiling. Verified on serper.dev 2026-09-04.
 *
 * For scale: the prose answer beside it costs a cent in search fees alone, so ten of these cost
 * less than one of those.
 */
export const IMAGE_SEARCH_USD = 0.001;

/** Enough to see a difference between them, few enough to fit a phone screen without scrolling. */
const MAX_IMAGES = 6;

/** Below this it is a logo, an icon or a swatch chip, not a photo of a fence. */
const MIN_WIDTH = 300;

/** What a fence looks like does not change week to week, and the same six types are asked about. */
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

const cache = new Map<string, { images: AnswerImage[]; at: number }>();

/** Tests only. */
export const clearPictureCache = (): void => cache.clear();

const normalise = (text: string) => text.trim().toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ');

/**
 * The line shown above the photos, written here rather than by a model.
 *
 * Says "screen" and not "below", because this is read out on voice calls too - and a voice call is
 * a web call with the page open in front of them, so the photos genuinely are on their screen. The
 * next question follows underneath it, exactly as it does under a prose answer.
 */
export const PICTURES_LINE = "Here you go — I've put some photos on your screen so you can see how it looks.";

/**
 * The half of the sentence that is asking rather than naming.
 *
 * "What colours does it come in" is six words of politeness around one that matters, and handed to
 * an image search whole it comes back with ordinary fences - the word "colours" is outweighed by
 * five words about nothing. Stripped, it searches for "colours treated pine fence australia" and
 * comes back with colours. Measured against the live API, not reasoned about.
 *
 * Only ever conversational words. Nothing here can be a fence, a colour or a material, so nothing
 * a customer is actually asking about can be thrown away by it.
 */
const ASKING = new Set([
  'show', 'me', 'us', 'please', 'can', 'could', 'i', 'you', 'we', 'got', 'have', 'has', 'do', 'does',
  'did', 'is', 'are', 'a', 'an', 'the', 'of', 'some', 'any', 'what', 'whats', 'which', 'look',
  'looks', 'looking', 'like', 'picture', 'pictures', 'pic', 'pics', 'photo', 'photos', 'image',
  'images', 'see', 'it', 'its', 'them', 'they', 'come', 'comes', 'want', 'need', 'get', 'my', 'for',
  'in', 'how', 'to', 'about', 'there',
]);

/**
 * What to search for, built in code from what they asked.
 *
 * Their own words go in first: "post and rail" has to reach Google whether or not this marketplace
 * has ever heard of it, which is the case the pictures matter most in. The fence they have already
 * chosen is added only when they did not name one themselves, so "what does it look like" three
 * questions in searches for the right thing instead of the word "it".
 */
export function imageQuery(question: string, material: string | null): string {
  const asked = normalise(question);
  const chosen = normalise(material ?? '');
  const named = chosen && chosen.split(' ').every((word) => asked.includes(word));

  /* Everything left once the asking is taken out. Some questions are made entirely of those words:
     "what does it look like" is asking about the fence they already chose, which follows on its
     own - and with nothing chosen either, their own sentence is still better than an empty one. */
  const stripped = asked.split(' ').filter((word) => word && !ASKING.has(word)).join(' ');
  const subject = stripped || (chosen ? '' : asked);

  return [subject, named || !chosen ? '' : chosen, /fenc/i.test(subject) ? '' : 'fence', 'australia']
    .filter(Boolean)
    .join(' ');
}

interface SerperImage {
  title?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  thumbnailUrl?: string;
  source?: string;
  domain?: string;
}

/**
 * Six photos from six different sites, rather than the first six Google returned.
 *
 * Left alone, an image search for a fence type returns one fencing company's gallery four times
 * over - so the customer's first look at "Colorbond" is four photos of one competitor's work, in
 * our own chat. Ordering by first-seen domain spreads them without dropping any: the leftovers
 * still follow, they are just no longer at the front.
 */
function spread(images: AnswerImage[]): AnswerImage[] {
  const seen = new Set<string>();
  const first: AnswerImage[] = [];
  const rest: AnswerImage[] = [];

  for (const image of images) {
    if (seen.has(image.sourceName)) rest.push(image);
    else {
      seen.add(image.sourceName);
      first.push(image);
    }
  }
  return [...first, ...rest].slice(0, MAX_IMAGES);
}

export async function findPictures(
  question: string,
  material: string | null,
  repo?: BusinessRepository,
): Promise<AnswerImage[]> {
  const query = imageQuery(question, material);
  if (!query.trim() || !env.SERPER_API_KEY) return [];

  const key = normalise(query);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < SEVEN_DAYS) return hit.images;

  try {
    const res = await fetch(SERPER_IMAGES, {
      method: 'POST',
      headers: { 'X-API-KEY': env.SERPER_API_KEY, 'content-type': 'application/json' },
      // `num` at ten stays inside one credit; more than ten costs two and nobody scrolls that far.
      body: JSON.stringify({ q: query, gl: 'au', num: 10 }),
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status, query }, 'image search refused');
      return [];
    }

    const body = (await res.json()) as { images?: SerperImage[] };
    const images = spread(
      (body.images ?? [])
        .filter((image) => image.imageUrl && image.thumbnailUrl && (image.imageWidth ?? 0) >= MIN_WIDTH)
        .map((image) => ({
          url: image.imageUrl!,
          thumbUrl: image.thumbnailUrl!,
          /* Who it belongs to, shown with the photo. The plain site name when Serper gives one,
             the bare host otherwise - never a URL, because this is printed under the picture and
             read out nowhere. */
          sourceName: (image.source || image.domain || '').replace(/^www\./, '').trim() || 'the web',
          width: image.imageWidth!,
          height: image.imageHeight ?? 0,
        })),
    );

    cache.set(key, { images, at: Date.now() });
    if (repo) await recordSpend(IMAGE_SEARCH_USD, repo);
    logger.info({ query, found: images.length }, 'looked up pictures');
    return images;
  } catch (err) {
    /* Same trade as a geocoding outage: the pictures are worth having and never worth the turn.
       The caller falls back to a written answer, and failing that the next question is asked. */
    logger.warn({ err, query }, 'could not look up pictures');
    return [];
  }
}
