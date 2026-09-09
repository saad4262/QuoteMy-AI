import { beforeEach, describe, expect, it } from 'vitest';
import { runChat } from '../../src/client/controller.js';
import { clearSchemaCache } from '../../src/client/schema.js';
import { clearTranscriptCache, type UploadedFile } from '../../src/ingest.js';
import { MemoryRepository, setRepository } from '../../src/store.js';

/**
 * What happens to a photograph of a room.
 *
 * A fencing customer attaches a quote - words on a page, transcribed and trusted. A tiling customer
 * attaches PHOTOGRAPHS OF A BATHROOM, and the transcription prompt's entire job was copying out
 * text that a photo of a room does not have. So the transcript came back empty, `unreadable` was
 * set, and nothing on this side of the product ever read that flag: they uploaded three pictures,
 * watched them upload, and were asked the next question as if they had not.
 *
 * Two things fixed that, and this file holds both to their word. A photo is now DESCRIBED rather
 * than dropped - and a description is never allowed to become a fact.
 */

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/* Big enough that the offline stand-in treats it as a picture of somewhere rather than a blank
   page - see `MockClient.transcribe`. `detectKind` reads the PNG magic either way. */
const photo = (name: string): UploadedFile => ({
  originalname: name,
  mimetype: 'image/png',
  buffer: Buffer.from([...PNG, ...Array(64).fill(0x01)]),
});

/** A few bytes and nothing in them: the blank page the prompt's last rule is about. */
const blankPhoto = (name: string): UploadedFile => ({
  originalname: name,
  mimetype: 'image/png',
  buffer: Buffer.from([...PNG, 0x00]),
});

const textFile = (name: string, body: string): UploadedFile => ({
  originalname: name,
  mimetype: 'text/plain',
  buffer: Buffer.from(body, 'utf8'),
});

beforeEach(() => {
  setRepository(new MemoryRepository());
  clearSchemaCache();
  clearTranscriptCache(); // transcripts are cached by hash, and these tests reuse the same bytes
});

const turn = (files: UploadedFile[], message = 'I need my bathroom retiled') =>
  runChat({ sessionId: 's1', message, trade: 'tiling' } as never, files);

describe('a photo of a room', () => {
  it('is not reported as unreadable, because it was read', () => {
    // It has no words on it, but it is not nothing - and telling somebody their photo could not be
    // read when it has just been described is the wrong half of the old bug.
    return turn([photo('bathroom.png')]).then((response) => {
      expect(response.message).not.toContain('could not read');
    });
  });

  it('still asks the question the turn was going to ask', async () => {
    const [withPhoto, without] = await Promise.all([turn([photo('bathroom.png')]), turn([])]);
    expect(withPhoto.options).toEqual(without.options);
  });
});

describe('a photo with nothing in it at all', () => {
  it('says so, and names the file', async () => {
    const response = await turn([blankPhoto('blank.png')]);
    expect(response.message).toContain('could not read anything from blank.png');
  });

  it('names every file it could not read', async () => {
    const response = await turn([blankPhoto('one.png'), blankPhoto('two.png')]);
    expect(response.message).toContain('one.png');
    expect(response.message).toContain('two.png');
  });

  it('still asks the question the turn was going to ask', async () => {
    // The notice goes in FRONT of the turn, it does not replace it - the same way an answer to the
    // customer's own question does. Being told about the file must not cost them their place.
    const [withBlank, without] = await Promise.all([turn([blankPhoto('blank.png')]), turn([])]);
    expect(withBlank.message).toContain(without.message);
    expect(withBlank.options).toEqual(without.options);
  });
});

describe('an attachment that was read', () => {
  it('says nothing about reading it', async () => {
    const response = await turn([textFile('quote.txt', 'Retile bathroom, 12m2. Total $4,850.')]);
    expect(response.message).not.toContain('could not read');
  });

  it('says nothing when nothing was attached', async () => {
    const response = await turn([]);
    expect(response.message).not.toContain('could not read');
  });
});

/**
 * The line this whole feature stands or falls on.
 *
 * `readAttachmentFacts` is regular expressions, and what it produces is trusted with no further
 * check - `mergeAndDecide` runs `mentioned()` over the MODEL's claims and deliberately not over
 * these, because a copy of a page cannot invent a figure. A description is the opposite kind of
 * thing entirely, and read by that same code it would arrive on the customer's brief wearing the
 * clothes of a fact off their own quote, with the one check that might have caught it switched off.
 */
describe('a description never becomes a fact', () => {
  it('fills nothing in from a photo', async () => {
    const response = await turn([photo('bathroom.png')]);
    // Nothing but what the message itself said. Notably no areaSqm, and no tile.
    expect(response.checklist.areaSqm ?? null).toBeNull();
    expect(response.checklist.tileType ?? null).toBeNull();
  });

  it('reads the quote beside it and still not the photo', async () => {
    /* The realistic tiling attachment: the quote AND pictures of the room. Everything on the quote
       is read; everything in the pictures stays out of the checklist. */
    const response = await turn([
      textFile('quote.txt', 'Retile ensuite. Supply and install 600x600 porcelain. Total $5,720.'),
      photo('bathroom.png'),
    ]);
    expect(response.checklist.jobType).toBe('ensuite');
    expect(response.checklist.tileType).toBe('large_format_600x600');
    expect(response.checklist.existingPrice).toBe(5720);
  });
});
