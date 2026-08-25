import { createHash } from 'node:crypto';
import { getAiClient, type AiClient, type ModelFile, type StageUsage } from './ai.js';
import { downloadFile } from './firebase.js';
import { AppError, unprocessable } from './http.js';
import { transcribePrompt } from './prompts.js';
import { transcriptSchema } from './schemas.js';
import type { SubmissionFile } from './store.js';

/**
 * Turning whatever the business attached into one piece of text.
 *
 * Everything the rest of the pipeline sees comes out of here: review, extraction and — most
 * importantly — quote verification all work against this transcript. That is what makes the
 * honesty guarantee survive file uploads: "the sentence this number came from" has to be a
 * sentence in something, and this is that something.
 */

export type FileKind = 'text' | 'pdf' | 'image' | 'document' | 'spreadsheet';

export interface SourceDocument {
  label: string;
  kind: FileKind;
  /** "text" = read from the bytes, exact. "model" = read off a document, worth a second look. */
  readBy: 'text' | 'model';
  chars: number;
  unreadable: boolean;
}

export interface Source {
  text: string;
  documents: SourceDocument[];
  usage?: StageUsage;
}

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
}

/** Ours, and well under OpenAI's 50 MB — these are about our bill and our response time. */
export const LIMITS = { perFile: 20 * 1024 * 1024, perRequest: 40 * 1024 * 1024, count: 6 } as const;

interface Signature {
  kind: FileKind;
  mime: string;
  /** Bytes that must match at `offset`. */
  magic: number[];
  offset?: number;
}

// Type comes from the bytes. The extension and the client's Content-Type are both caller-supplied
// and both lie — a .pdf that is really a script must not be treated as a PDF because of its name.
const SIGNATURES: Signature[] = [
  { kind: 'pdf', mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { kind: 'image', mime: 'image/png', magic: [0x89, 0x50, 0x4e, 0x47] },
  { kind: 'image', mime: 'image/jpeg', magic: [0xff, 0xd8, 0xff] },
  { kind: 'image', mime: 'image/gif', magic: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { kind: 'image', mime: 'image/webp', magic: [0x57, 0x45, 0x42, 0x50], offset: 8 }, // RIFF….WEBP
];

// iPhones produce these, and OpenAI's image input does not accept them. Detected so the business
// gets "send it as a JPEG" instead of a 500 from somewhere deep in the stack.
const HEIC_BRANDS = ['heic', 'heix', 'heif', 'hevc', 'mif1'];

const startsWith = (buffer: Buffer, magic: number[], offset = 0) =>
  magic.every((byte, i) => buffer[offset + i] === byte);

const isHeic = (buffer: Buffer) =>
  buffer.length > 12 &&
  buffer.subarray(4, 8).toString('latin1') === 'ftyp' &&
  HEIC_BRANDS.includes(buffer.subarray(8, 12).toString('latin1').toLowerCase());

/** Zip container: .docx and .xlsx both are one. The extension decides which, since the bytes cannot. */
const isZip = (buffer: Buffer) => startsWith(buffer, [0x50, 0x4b]); // PK

/** Text only if it round-trips as UTF-8 and holds no NUL — binary mislabelled as .txt fails here. */
function looksLikeText(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, 4096);
  if (sample.includes(0)) return false;
  return Buffer.from(sample.toString('utf8'), 'utf8').equals(sample);
}

/** Strip a filename to a plain label. `ignore-all-previous-instructions.pdf` is a real technique. */
export function safeName(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? 'file';
  return (
    base
      .normalize('NFKC')
      .replace(/[^\w. -]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60) || 'file'
  );
}

export function detectKind(buffer: Buffer, filename: string): { kind: FileKind; mime: string } {
  if (isHeic(buffer)) {
    throw new AppError(
      415,
      'We cannot read HEIC photos yet - send it as a JPEG and we will take a look',
      'unsupported_file_type',
    );
  }

  for (const sig of SIGNATURES) {
    if (startsWith(buffer, sig.magic, sig.offset)) return { kind: sig.kind, mime: sig.mime };
  }

  if (isZip(buffer)) {
    const ext = filename.toLowerCase().split('.').pop();
    if (ext === 'docx') {
      return { kind: 'document', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    }
    if (ext === 'xlsx') {
      return { kind: 'spreadsheet', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
    }
  }

  if (looksLikeText(buffer)) return { kind: 'text', mime: 'text/plain' };

  throw new AppError(
    415,
    `We cannot read "${safeName(filename)}" - send a PDF, a photo, a Word file or plain text`,
    'unsupported_file_type',
  );
}

export function assertWithinLimits(files: UploadedFile[]): void {
  if (files.length > LIMITS.count) {
    throw new AppError(413, `Send up to ${LIMITS.count} files at a time`, 'payload_too_large');
  }

  let total = 0;
  for (const file of files) {
    total += file.buffer.length;
    if (file.buffer.length > LIMITS.perFile) {
      throw new AppError(
        413,
        `"${safeName(file.originalname)}" is too large - keep each file under ${LIMITS.perFile / 1024 / 1024} MB`,
        'payload_too_large',
      );
    }
  }
  if (total > LIMITS.perRequest) {
    throw new AppError(413, `Those files add up to more than ${LIMITS.perRequest / 1024 / 1024} MB`, 'payload_too_large');
  }
}

/**
 * Turn Storage PATHS (what the frontend wrote) into the same in-memory files multer would have
 * given us. Downstream — magic bytes, limits, transcription — is unchanged.
 */
export async function filesFromStorage(
  files: SubmissionFile[],
  download: (path: string) => Promise<Buffer> = downloadFile,
): Promise<UploadedFile[]> {
  const out: UploadedFile[] = [];
  for (const file of files) {
    if (!file.path) continue;
    const buffer = await download(file.path);
    out.push({
      originalname: file.name || file.path.split('/').pop() || 'file',
      mimetype: file.contentType || 'application/octet-stream',
      buffer,
    });
  }
  return out;
}

/**
 * Transcripts are cached by the file's own sha256. Resubmissions are roughly half of all runs - a
 * business fixing three rates and re-uploading the same scan should pay to read it once.
 * In-memory for now; it moves behind the repository when there is a database.
 */
const transcripts = new Map<string, { text: string; unreadable: boolean }>();
const sha256 = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');

/** Tests only. */
export const clearTranscriptCache = () => transcripts.clear();

/**
 * Reads pasted text and attached files into one transcript.
 *
 * Plain text is decoded here, for free and exactly. Everything else goes to the model in a single
 * transcription call whose only job is to copy the document out - see prompts/transcribe.system.md.
 */
export async function readSource(
  text: string,
  files: UploadedFile[],
  deps: { ai?: AiClient } = {},
): Promise<Source> {
  assertWithinLimits(files);

  const documents: SourceDocument[] = [];
  const parts: string[] = [];
  const toTranscribe: { label: string; hash: string; file: ModelFile }[] = [];

  if (text.trim()) {
    documents.push({ label: 'typed', kind: 'text', readBy: 'text', chars: text.trim().length, unreadable: false });
    parts.push(text.trim());
  }

  for (const file of files) {
    const label = safeName(file.originalname);
    const { kind, mime } = detectKind(file.buffer, file.originalname);

    if (kind === 'text') {
      const decoded = file.buffer.toString('utf8').trim();
      documents.push({ label, kind, readBy: 'text', chars: decoded.length, unreadable: !decoded });
      if (decoded) parts.push(`[${label}]\n${decoded}`);
      continue;
    }

    const hash = sha256(file.buffer);
    const cached = transcripts.get(hash);
    if (cached) {
      documents.push({ label, kind, readBy: 'model', chars: cached.text.length, unreadable: cached.unreadable });
      if (cached.text) parts.push(`[${label}]\n${cached.text}`);
      continue;
    }

    toTranscribe.push({
      label,
      hash,
      file: { name: label, mime, data: file.buffer, isImage: kind === 'image' },
    });
    documents.push({ label, kind, readBy: 'model', chars: 0, unreadable: false });
  }

  if (!toTranscribe.length) return { text: parts.join('\n\n'), documents };

  const ai = deps.ai ?? getAiClient();
  const result = await ai.callStructured({
    name: 'transcribe',
    schema: transcriptSchema,
    system: transcribePrompt(),
    user: `Transcribe the ${toTranscribe.length} attached document(s). Use the filename as each label.`,
    files: toTranscribe.map((t) => t.file),
    maxOutputTokens: 16000,
    timeoutMs: 90_000,
  });

  // Match on label where the model used ours, fall back to position - the model is asked for one
  // entry per document but the pipeline must not fall over if it pairs them up differently.
  for (const [i, entry] of toTranscribe.entries()) {
    const returned =
      result.data.documents.find((d) => d.label === entry.label) ?? result.data.documents[i];
    const transcript = { text: (returned?.text ?? '').trim(), unreadable: returned?.unreadable ?? true };

    transcripts.set(entry.hash, transcript);

    const doc = documents.find((d) => d.label === entry.label && d.chars === 0);
    if (doc) {
      doc.chars = transcript.text.length;
      doc.unreadable = transcript.unreadable;
    }
    if (transcript.text) parts.push(`[${entry.label}]\n${transcript.text}`);
  }

  return { text: parts.join('\n\n'), documents, usage: result.usage };
}

/**
 * The `[filename]` headers above are for a human reading the transcript. They are stripped before
 * quote verification, so a header can never satisfy a source-quote check on its own.
 */
export const stripProvenance = (text: string) => text.replace(/^\[[^\]\n]{1,60}\]$/gm, '').trim();

export function assertSomethingArrived(source: Source): void {
  if (!source.text.trim()) {
    throw unprocessable(
      source.documents.length
        ? 'We could not read anything from what you sent - try typing your rates in, or send a clearer photo'
        : 'Send your pricing details and we will take a look',
    );
  }
}
