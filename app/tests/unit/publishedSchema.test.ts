import { beforeEach, describe, expect, it } from 'vitest';
import { runFencingChat } from '../../src/client/controller.js';
import { FENCING_FIELDS } from '../../src/client/fieldSpec.js';
import { clearSchemaCache, loadTradeSchema } from '../../src/client/schema.js';
import { MemoryRepository, type StoredTradeSchema } from '../../src/store.js';
import type { Trade } from '../../src/vocab.js';

/**
 * The milestone of `docs/DYNAMIC-SCHEMA-PLAN.md` phase 1: the checklist is published, not compiled.
 *
 * Two things have to be true at once, and they pull against each other. A document somebody edits
 * in the Firestore console must reach a customer's screen with no deploy - and a document somebody
 * edits WRONGLY must not reach them at all. So every case below is either "the published spec won"
 * or "the published spec was refused whole and the compiled one stood in".
 */

/** A repository that publishes whatever `fields` a test hands it. */
class PublishingRepository extends MemoryRepository {
  constructor(private readonly published: StoredTradeSchema) {
    super();
  }
  override async getTradeSchema(_trade: Trade): Promise<StoredTradeSchema | null> {
    return this.published;
  }
}

const withFields = (fields: unknown[]) => new PublishingRepository({ fields });

/** The compiled spec, deep-copied so a test's edit cannot leak into the next one. */
const compiledCopy = () => JSON.parse(JSON.stringify(FENCING_FIELDS)) as Record<string, unknown>[];

beforeEach(() => clearSchemaCache());

describe('a published field spec', () => {
  it('reaches the chat without a code change', async () => {
    const fields = compiledCopy();
    fields[1]!.question = 'Which fence takes your fancy?';

    const repo = withFields(fields);
    let response = await runFencingChat({ message: 'I need a fence', sessionId: 't', place: '', knownChecklist: '' }, [], { repo });
    response = await runFencingChat(
      { message: 'yes', sessionId: 't', place: '', knownChecklist: JSON.stringify(response.checklist) },
      [],
      { repo },
    );
    response = await runFencingChat(
      {
        message: 'Berwick',
        sessionId: 't',
        place: JSON.stringify({ latitude: -38.03, longitude: 145.34, suburb: 'Berwick', displayLabel: 'Berwick, VIC 3806' }),
        knownChecklist: JSON.stringify(response.checklist),
      },
      [],
      { repo },
    );

    expect(response.message).toContain('Which fence takes your fancy?');
  });

  it('can reorder the questions', async () => {
    const fields = compiledCopy();
    // Height before material, which is the reverse of the compiled order.
    [fields[1], fields[2]] = [fields[2]!, fields[1]!];

    const schema = await loadTradeSchema('fencing', withFields(fields));
    expect(schema.fields.map((f) => f.key).slice(0, 3)).toEqual(['suburb', 'heightKey', 'material']);
    expect(schema.fromFirestore).toBe(true);
  });

  it('can rename what a field is called on screen', async () => {
    const fields = compiledCopy();
    fields[1]!.title = 'Fence type';

    const schema = await loadTradeSchema('fencing', withFields(fields));
    expect(schema.fields[1]?.title).toBe('Fence type');
  });
});

describe('a published field spec that cannot be executed', () => {
  /** Every one of these must leave the customer with the compiled spec, whole. */
  const refused: [string, () => unknown[]][] = [
    [
      'names a type the code does not have',
      () => {
        const fields = compiledCopy();
        fields[1]!.type = 'colour-picker';
        return fields;
      },
    ],
    [
      'names the same field twice',
      () => [...compiledCopy(), { key: 'material', type: 'enum', source: 'core.materials' }],
    ],
    [
      'has a field with no key',
      () => [...compiledCopy(), { type: 'enum', source: 'core.materials' }],
    ],
    [
      'depends on a field that does not exist',
      () => {
        const fields = compiledCopy();
        fields[7]!.dependsOn = { field: 'sunroof', notEquals: 'none' };
        return fields;
      },
    ],
    [
      'is keyed by a field that does not exist',
      () => {
        const fields = compiledCopy();
        fields[2]!.optionsKeyedBy = 'sunroof';
        return fields;
      },
    ],
    [
      'asks a multiple choice with no answers in it',
      () => {
        const fields = compiledCopy();
        delete fields[1]!.source;
        delete fields[1]!.options;
        return fields;
      },
    ],
  ];

  for (const [why, build] of refused) {
    it(`is refused when it ${why}`, async () => {
      const schema = await loadTradeSchema('fencing', withFields(build()));
      expect(schema.fields).toEqual(FENCING_FIELDS);
    });
  }

  it('is refused whole, never field by field', async () => {
    // One broken field alongside seven good ones. Taking the seven would look like the chat
    // forgetting a question rather than like a bad document, so the whole document is dropped.
    const fields = compiledCopy();
    fields[1]!.question = 'Which fence takes your fancy?'; // a good edit...
    fields[6]!.type = 'nonsense'; // ...next to a bad one
    const schema = await loadTradeSchema('fencing', withFields(fields));
    expect(schema.fields).toEqual(FENCING_FIELDS);
    expect(schema.fields[1]?.question).not.toBe('Which fence takes your fancy?');
  });

  it('falls back when the document publishes no fields at all', async () => {
    const schema = await loadTradeSchema('fencing', new MemoryRepository());
    expect(schema.fields).toEqual(FENCING_FIELDS);
  });
});
