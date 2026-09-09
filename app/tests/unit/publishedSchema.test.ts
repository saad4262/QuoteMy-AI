import { beforeEach, describe, expect, it } from 'vitest';
import { runChat } from '../../src/client/controller.js';
import { describeFieldDrift, FENCING_FIELDS } from '../../src/client/fieldSpec.js';
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
    let response = await runChat({ message: 'I need a fence', sessionId: 't', place: '', knownChecklist: '' }, [], { repo });
    response = await runChat(
      { message: 'yes', sessionId: 't', place: '', knownChecklist: JSON.stringify(response.checklist) },
      [],
      { repo },
    );
    response = await runChat(
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

/**
 * A document written before the code grew a key must not switch that key off.
 *
 * This is not hypothetical: `schema/fencing` in production was written before `namedBy`, `aliases`
 * and `recap` existed. Read bare, it turned off the phrasing of every confirmation and the words
 * that let "no, the fence type is wrong" reopen a field - no error, no log, just a chat quietly
 * worse than the code it was running.
 */
describe('a published field spec that predates part of the code', () => {
  const compiledMaterial = FENCING_FIELDS.find((spec) => spec.key === 'material')!;

  it('keeps what the document does not mention', async () => {
    // Every key the older document actually had, and nothing that came later.
    const older = FENCING_FIELDS.map(({ key, type, title, question, source, pinned, asked }) =>
      JSON.parse(JSON.stringify({ key, type, title, question, source, pinned, asked })),
    );

    const schema = await loadTradeSchema('fencing', withFields(older));
    const material = schema.fields.find((spec) => spec.key === 'material')!;

    expect(material.namedBy).toEqual(compiledMaterial.namedBy);
    expect(material.aliases).toEqual(compiledMaterial.aliases);
    expect(schema.fields.find((spec) => spec.key === 'removal')?.recap).toEqual(
      FENCING_FIELDS.find((spec) => spec.key === 'removal')?.recap,
    );
  });

  /* JSON turns /fence type/i into {} rather than dropping it, so a publisher that round-tripped a
     spec would write a key that LOOKS answered and means nothing. The code's own value wins. */
  it('ignores a regular expression somebody flattened on the way in', async () => {
    const fields = compiledCopy();
    expect(fields[1]!.namedBy).toEqual({}); // what JSON did to it - the reason this test exists

    const schema = await loadTradeSchema('fencing', withFields(fields));
    expect(schema.fields[1]?.namedBy).toEqual(compiledMaterial.namedBy);
  });

  it('still lets the document win on everything it can carry', async () => {
    const fields = compiledCopy();
    fields[1]!.title = 'Fence type';
    fields[1]!.question = 'Which fence takes your fancy?';

    const schema = await loadTradeSchema('fencing', withFields(fields));
    expect(schema.fields[1]).toMatchObject({ title: 'Fence type', question: 'Which fence takes your fancy?' });
    expect(schema.fields[1]?.namedBy).toEqual(compiledMaterial.namedBy);
  });

  /**
   * The same protection, one level down.
   *
   * `namedBy` is a bare regular expression, so JSON leaves `{}` behind and the shape check above
   * catches it. `docHints` is an OBJECT holding regular expressions, and a round trip leaves
   * something far more dangerous: a hint list that still has its slugs and has lost every pattern.
   * That object is not a RegExp and not a function, so a shape check looking only at the top level
   * waves it through - and every document this trade reads goes quietly blank.
   *
   * Nothing about that failure is visible: no throw, no log, no empty field on a screen. Just
   * attachments that stop being read, on the day somebody publishes a schema from the console.
   */
  it('ignores document hints somebody flattened on the way in', async () => {
    const fields = compiledCopy();
    const flattened = fields[1]!.docHints as { values: unknown[] };
    /* What JSON did to them: the slug survived and the pattern became `{}` - a hint that still
       looks like a hint and matches nothing. (`publishable()` on the write side drops the pattern
       instead, leaving `['pool_glass']`; both are the same corruption wearing different clothes.) */
    expect(flattened.values[0]).toEqual(['pool_glass', {}]);

    const schema = await loadTradeSchema('fencing', withFields(fields));
    expect(schema.fields[1]?.docHints).toEqual(compiledMaterial.docHints);
  });

  it('keeps document hints a document has never heard of', async () => {
    const older = FENCING_FIELDS.map(({ key, type, title, question, source, pinned, asked }) =>
      JSON.parse(JSON.stringify({ key, type, title, question, source, pinned, asked })),
    );

    const schema = await loadTradeSchema('fencing', withFields(older));
    expect(schema.fields.find((spec) => spec.key === 'material')?.docHints).toEqual(compiledMaterial.docHints);
    expect(schema.fields.find((spec) => spec.key === 'heightKey')?.docKey).toBe('heightMm');
  });
});

/**
 * A label group written before one of its values existed must not take that label away.
 *
 * `schema/fencing` held `removes: {timber, metal}` and no `any`, from before "Yes, take it away"
 * was an answer at all. The group replaced the compiled one whole, so the chip read "Any" - the
 * slug, title-cased - on every fencing conversation in production. The golden tests never saw it:
 * they run against the compiled labels, and only production reads the document.
 */
describe('a published label group that predates one of its values', () => {
  class PublishingLabels extends MemoryRepository {
    constructor(private readonly labels: Record<string, Record<string, string>>) {
      super();
    }
    override async getTradeSchema(): Promise<StoredTradeSchema | null> {
      return { labels: this.labels };
    }
  }

  it('keeps the label the document does not mention', async () => {
    const schema = await loadTradeSchema('fencing', new PublishingLabels({ removes: { timber: 'Timber fence' } }));

    expect(schema.labels.removes?.any).toBe('Yes, take it away');
    expect(schema.labels.removes?.timber).toBe('Timber fence');
  });

  it('still lets the document rename what it does mention', async () => {
    const schema = await loadTradeSchema('fencing', new PublishingLabels({ removes: { any: 'Yes please', timber: 'Old timber' } }));

    expect(schema.labels.removes?.any).toBe('Yes please');
    expect(schema.labels.removes?.timber).toBe('Old timber');
    // And a value only the document knows - an extra promoted out of what businesses offered.
    clearSchemaCache(); // a second load of the same trade in one test is otherwise the first one
    const withExtra = await loadTradeSchema('fencing', new PublishingLabels({ materials: { 'bamboo-screening': 'Bamboo screening' } }));
    expect(withExtra.labels.materials?.['bamboo-screening']).toBe('Bamboo screening');
    expect(withExtra.labels.materials?.colorbond).toBe('Colorbond');
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
        /* Pointed at a list the document does not have, rather than at nothing: a spec that simply
           OMITS `source` now keeps the compiled one, because a published spec is merged onto the
           compiled spec instead of replacing it. Only a spec that actively names an empty list is
           a question with no answers. */
        fields[1]!.source = 'core.materialsThatDoNotExist';
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

describe('drift between the published checklist and the compiled one', () => {
  it('says nothing when they agree', () => {
    expect(describeFieldDrift(FENCING_FIELDS, compiledCopy())).toBeNull();
    expect(describeFieldDrift(FENCING_FIELDS, [])).toBeNull();
    expect(describeFieldDrift(FENCING_FIELDS, undefined)).toBeNull();
  });

  it('names a question this trade will now never ask', () => {
    const fields = compiledCopy().filter((f) => f.key !== 'conditions');
    expect(describeFieldDrift(FENCING_FIELDS, fields)).toEqual({
      dropped: ['conditions'],
      added: [],
      unknownTypes: [],
    });
  });

  it('names a field the code has never heard of, which is normal for a new trade', () => {
    const fields = [...compiledCopy(), { key: 'tileSize', type: 'enum', source: 'core.tileSizes' }];
    expect(describeFieldDrift(FENCING_FIELDS, fields)).toEqual({
      dropped: [],
      added: ['tileSize'],
      unknownTypes: [],
    });
  });

  it('names a type nothing can execute', () => {
    const fields = compiledCopy();
    fields[1]!.type = 'colour-picker';
    expect(describeFieldDrift(FENCING_FIELDS, fields)?.unknownTypes).toEqual(['material']);
  });
});
