import type { Trade } from '../../src/vocab.js';

/**
 * What each fixture SHOULD produce.
 *
 * This is the thing the project has been missing: a prompt or schema change can be scored instead
 * of eyeballed. Two real faults this session - a fully compliant submission rejected over an
 * unpriced extra, and a suburb quietly resolving to the wrong town - were both caught by a human
 * reading output. Neither would have survived a run of this.
 *
 * Every number below was verified by hand against the fixture text, and then against a live run -
 * in that order, which matters. Three of them were wrong on the first pass and the live run is what
 * said so: two kitchen counts where the fixture prints five lines and the closed vocabulary has
 * four slugs, and a base location read off the wrong line of the same document. Hand-reading first
 * is what makes those findings rather than transcription; scoring the model against figures copied
 * out of its own output would agree with itself for ever.
 *
 * RUN IT LIVE. `npm run eval` uses the mock and is a regression net, nothing more - the mock
 * extracts rates only, says so in its own `notUsed` line, and will report every count and every
 * tiling tile type as missing whatever the model does. `npm run eval -- --live` is the number that
 * means something.
 *
 * It has already paid for itself once. Scoring the four new trades on figures rather than on the
 * verdict is what exposed a flaky approval on the retaining wall fixture - the same complete price
 * list approved on one run and rejected on the next - and that turned out to be a real gap in the
 * rules rather than model noise. See that entry below; rule 2a exists because of it.
 */
export interface Expectation {
  file: string;
  approved: boolean;
  /**
   * Which pipeline the fixture goes through. Omitted means fencing, which is what every entry
   * meant back when fencing was the only trade with a fixture here - and what the runner used to
   * hardcode, so a tiling price list submitted through it would have been reviewed against
   * fencing's rules and failed for reasons that say nothing about tiling.
   */
  trade?: Trade;
  /** Exact values that must come out. Anything absent here is not scored. */
  pricing?: {
    gstIncluded?: boolean | null;
    minimumCharge?: number | null;
    baseLocation?: string | null;
    radiusKm?: number | null;
    /**
     * The core rate table, written the same way for every trade: bucket, then the thing inside the
     * bucket, then the price. What those two names MEAN is the trade's own business - a fence's
     * material and height, a tiler's room and tile, a fitter's job and kitchen size, a wall's
     * supply model and system, a deck's height and board - and the runner resolves both against
     * whatever shape that trade actually stores, so nothing here has to know.
     */
    rates?: Record<string, Record<string, number>>;
    removals?: { removes: string; pricePerMetre: number }[];
    gateCount?: number;
    siteConditionCount?: number;
    /**
     * How many rows a priced collection came back with, by its field name on `pricing` -
     * `{ balustrades: 5, stairs: 3 }`. A count is a weaker claim than a figure and is used where
     * the figure depends on a classification the fixture does not settle: what matters about a
     * deck's five balustrade types is that five arrived, not which slug each got.
     *
     * `gateCount` and `siteConditionCount` above are fencing's own, from before this existed. They
     * are left where they are rather than folded in here, because every number in fencing's block
     * was read off its fixture by hand and re-checked against live output, and rewriting a verified
     * expectation to tidy the shape is how a checked number quietly becomes an unchecked one.
     */
    counts?: Record<string, number>;
  };
  tags?: string[];
}

export const EXPECTATIONS: Expectation[] = [
  {
    /** Everything the client's checklist asks for. This is what a pass looks like now. */
    file: 'description-COMPLETE-fencing.txt',
    approved: true,
    pricing: {
      gstIncluded: true,
      minimumCharge: 850,
      baseLocation: 'Berwick',
      radiusKm: 30,
      rates: {
        timber_pine: { '0.9m': 62, '1.2m': 71, '1.5m': 79, '1.8m': 85, '2.1m': 104 },
        timber_hardwood: { '1.5m': 118, '1.8m': 132, '2.1m': 158 },
        colorbond: { '1.2m': 88, '1.5m': 96, '1.8m': 110, '2.1m': 128 },
        aluminium: { '1.2m': 165, '1.5m': 184, '1.8m': 210 },
        pool_aluminium: { '1.2m': 195, '1.35m': 215 },
        chainmesh: { '1.8m': 74, '2.4m': 92 },
        rural_wire: { '1.2m': 38 },
      },
      removals: [
        { removes: 'timber', pricePerMetre: 18 },
        { removes: 'metal', pricePerMetre: 24 },
      ],
      gateCount: 6,
      // Four, not three. "Rock or hand-dig only ... add $22 per metre" is one line naming TWO
      // conditions, and both must be stored: a customer whose site is hand-dig-only would
      // otherwise be quoted without the surcharge. Corrected after the first eval run.
      siteConditionCount: 4,
    },
  },
  {
    /**
     * This used to be the pass. It stopped being one on 2026-08-21, when the client's checklist
     * made build specs, permits, warranty and a travel position blocking - and this fixture states
     * none of them. It is kept precisely because it is a good, well-written price list that now
     * fails: if it ever passes again, a blocking rule has quietly stopped working.
     */
    file: 'description-GOOD-southeast-fencing.txt',
    approved: false,
  },
  {
    // Deliberately longer and more charming than the good one, with almost no usable price.
    // If this is ever approved, the review has gone soft.
    file: 'description-BAD-daves-fencing.txt',
    approved: false,
  },

  /* The other four trades. Each pair is one trade's own argument: a price list that must pass, on
     its figures, and one that must FAIL for that trade's own characteristic reason rather than for
     being thin. A single approved fixture proves only that the reviewer can say yes. */

  {
    /* Per-m2 rates on every tile type, floor and wall apart, preparation with units, waterproofing
       per wet area, both supply models. The complete answer to T1-T9.
     *
     * WHAT IS DELIBERATELY NOT SCORED, and why this list is shorter than the fixture. Three lines
     * have more than one defensible reading and the file's own rule is that anything absent is not
     * scored - asserting a guess would score the model against my opinion rather than against the
     * document. "Standard floor tiling $65" names no tile at all and null is the right answer, not
     * ceramic. "Outdoor porcelain $85" sits under the FLOOR heading and could be filed as an
     * outdoor job or as an outdoor-porcelain tile on a floor. "Feature wall tile $85" says feature
     * and not which. Each is a judgement the fixture does not settle, so each is left out. */
    file: 'description-COMPLETE-tiling.txt',
    trade: 'tiling',
    approved: true,
    pricing: {
      gstIncluded: true,
      minimumCharge: 350,
      baseLocation: 'Pakenham',
      radiusKm: 25,
      rates: {
        /* Floor and wall are the same tile at different prices, which is the split T1 exists for:
           porcelain is $72 down and the 600x1200 is $88 on a floor against $95 on a wall. */
        floor_only: {
          porcelain: 72,
          large_format_600x1200: 88,
          large_format_900x900: 95,
          large_format_1200x1200: 110,
          herringbone: 115,
          natural_stone: 125,
        },
        wall_only: {
          subway: 78,
          mosaic: 120,
          large_format_600x1200: 95,
          large_format_900x900: 105,
          natural_stone: 130,
        },
      },
      counts: { waterproofing: 5, removals: 4, prep: 8, tileSupply: 5 },
    },
  },
  {
    /* An hourly tiler. Every figure on the page is firm and none of them can be multiplied by a
       customer's square metres, which is T1. If this is ever approved, the rule that makes tiling
       quotable has stopped firing - and the failure would be invisible on the business side,
       because the price list is genuinely good. It surfaces as a customer who cannot be quoted. */
    file: 'description-BAD-tiling.txt',
    trade: 'tiling',
    approved: false,
  },

  {
    /* Installation priced both ways - by size and per cabinet - both supply models, demolition,
       benchtops by material, preparation, extras. The complete answer to K1-K9.
     *
     * The bucket is `install_only`, and it is the one thing here worth stating out loud: the three
     * sizes sit under "INSTALLATION - CUSTOMER-SUPPLIED KITCHEN", so that is the heading they are
     * filed under, and the quote path has to reach them from a customer REPLACING a kitchen too.
     * It does - `rateForJob` falls back through the general bucket and then the rest - and that
     * fallback exists because this exact filing once told a customer nobody priced a kitchen their
     * size, from the one business that priced all three.
     *
     * "Medium" is scored as `standard`, which is the vocabulary's word for the middle size. A
     * business writes the word it uses; the closed list decides what it is stored as, and that
     * mapping is exactly the kind of thing that breaks silently. */
    file: 'description-COMPLETE-kitchen.txt',
    trade: 'kitchen',
    approved: true,
    pricing: {
      gstIncluded: true,
      minimumCharge: 450,
      /* The letterhead, not the "Based in Pakenham" line further down, and both are in the
         document. The fuller one is the better answer: `baseLocation` is geocoded, and a postcode
         is what stops a Pakenham in another state from being the one we match against. Tiling's
         fixture has no postcode on its letterhead and comes back as the bare suburb - the model
         follows the document each time rather than a habit. */
      baseLocation: 'Pakenham VIC 3810',
      radiusKm: 30,
      rates: { install_only: { small: 1950, standard: 2850, large: 4250 } },
      /* The per-cabinet rows - base $180, wall $165, tall $280, drawer $190 - are not scored as
         rates here. They live in the same array and are kept apart by their LABELS, which is the
         bug this trade shipped once: a reader that drops the label hands the verifier one rate
         priced four times. The golden snapshot is what holds those four apart. */
      /* FOUR removals and FOUR prep items, not the five lines each that the fixture prints, and
         the missing one in each case is correct. `KITCHEN_REMOVES` has no value for "Kitchen
         disposal" and `KITCHEN_PREP` none for "Splashback preparation", so both go to the extras
         and `couldNotUse` outlets rather than being forced into the nearest slug - which is the
         whole point of having those outlets (`CONTEXT.md` §8). Written as 5 and 5 here first, from
         counting the fixture's lines; the live run is what caught that the vocabulary, not the
         model, decides this number. */
      counts: { benchtops: 3, removals: 4, prep: 4 },
    },
  },
  {
    /* Priced by the lineal metre, which is how cabinetry is advertised everywhere and is exactly
       what K1's last line refuses. The most likely real submission on this trade to fail, and the
       one that fails while looking most like a professional price list. */
    file: 'description-BAD-kitchen.txt',
    trade: 'kitchen',
    approved: false,
  },

  {
    /* The same wall priced twice, once per supply model, which is what this trade's rate table is
       for. If this is rejected, the supply-column rule has been read as a duplicate.
     *
     * The figures are the argument. A timber sleeper wall is $145 a metre under one heading and
     * $285 under the other, and both are correct - the difference is who buys the sleepers. A
     * reader that collapses the two columns keeps one of those numbers and quotes every customer
     * with it, which is either half price or double, silently, on every job.
     *
     * ⚠ THIS IS THE FIXTURE RULE 2a WAS WRITTEN FOR, AND IT IS THE REGRESSION TEST FOR IT. Before
     * 2a it was a coin flip: four live runs on 2026-09-15 approved it twice and rejected it twice,
     * on identical text. Both rejections named the same lines:
     *
     *   "Add a unit to the timber, concrete, mixed-waste and soil disposal prices."
     *   "State whether the $650 drainage package is charged per job or per metre."
     *
     * Both observations were correct - "Timber disposal $480" genuinely states no unit. What was
     * wrong was treating them as BLOCKING. Disposal and a drainage package are not core rates, and
     * R4 of this trade's own rules already says "a single package price" satisfies drainage - but
     * the general rules had carve-outs only for UNPRICED extras (1a) and for "from" pricing (4a),
     * and neither covered rule 2, the unit rule. So a model applying rule 2 literally to a disposal
     * line was following the rules as written, and one reading their spirit approved. The coin flip
     * was those two readings, not noise, which is why re-running it never looked like a bug.
     *
     * Third time this shape has bitten: a gate motor and an engineering certificate each caused a
     * false rejection of a compliant business before their carve-outs were given their own headings
     * (`CLAUDE.md`: "an exception in a parenthetical gets ignored").
     *
     * AND THERE WAS A SECOND ONE UNDERNEATH IT, which only became visible once 2a stopped the
     * first. R2 used to end "If they do BOTH, both columns need their own rate per system", and
     * this builder does both while pricing timber posts only installation-only and tiered walls
     * only supply-and-install. Read literally that is two missing rates, and the model said so on
     * two runs in eight. R3 had already solved the identical problem one rule further down - "Do
     * NOT demand a band they never claimed to build at" - so R2 now carries the same guard. A gap
     * in one column is an answer, not a silence.
     *
     * 8/8 approved after both fixes, from 2/4 before either. If this entry starts flaking again,
     * check that rule 2a is still in `_general.md` AND still stated in `review.system.md` - the two
     * have to agree, and the prompt is the one the model follows - and that R2 still has its
     * both-columns guard. */
    file: 'description-COMPLETE-retaining-wall.txt',
    trade: 'retaining_wall',
    approved: true,
    pricing: {
      gstIncluded: true,
      minimumCharge: 650,
      /* The letterhead, postcode and all - the same as kitchen's and decking's. */
      baseLocation: 'Berwick VIC 3806',
      radiusKm: 30,
      rates: {
        labour_only: { timber_sleeper: 145, timber_post: 155, concrete_sleeper: 185, steel_post: 195 },
        supply_and_install: {
          timber_sleeper: 285,
          premium_timber: 325,
          concrete_sleeper: 395,
          steel_post: 425,
          tiered: 450,
        },
      },
      /* The groundworks are NOT counted here on purpose. They are per hour, per day and per post -
         units a customer cannot answer for - and what matters about them is that they stayed OUT
         of the quotable rates, which the golden snapshot holds directly. */
      /* TWO site conditions, though the fixture prints three lines. "Difficult ground labour $125
         per hour" has no home in `RW_CONDITIONS` and the model says so in `couldNotUse` rather than
         filing it under the nearest value - which is the discipline that keeps this vocabulary
         worth having (`CONTEXT.md` §8). Written as 3 here first, from counting the lines; the live
         run is what showed the vocabulary decides it. */
      counts: { drainage: 5, siteConditions: 2 },
    },
  },
  {
    /* Reads as thorough and quotes nobody: per-metre rates with no supply model against them, plus
       ranges and POA on the core rates. What must NOT cause the rejection is "from $850" on an
       engineering certificate - that is rule 4a, and scoring this fixture is how a change that
       forgets the carve-out gets caught before a compliant business is turned away again. */
    file: 'description-THIN-retaining-wall.txt',
    trade: 'retaining_wall',
    approved: false,
  },

  {
    /* Sixteen per-m2 rates under four height headings, a balustrade in linear metres and stairs by
       the flight - the three quantities this trade quotes in one document.
     *
     * The rate table is the whole point of scoring this trade: the heights are HEADINGS that carry
     * down the page, so every board under "ELEVATED" has to pick up a height it is never written
     * beside. A reader that loses that files sixteen rates under one height, and the sixteen are
     * individually right - which is why a count would pass and only the figures catch it. */
    file: 'description-COMPLETE-decking.txt',
    trade: 'decking',
    approved: true,
    pricing: {
      gstIncluded: true,
      minimumCharge: 1200,
      /* The letterhead, with its postcode - same as kitchen's, and for the same reason. */
      baseLocation: 'Berwick VIC 3806',
      radiusKm: 20,
      rates: {
        ground_level: { treated_pine: 280, merbau: 420, spotted_gum: 445, blackbutt: 465, composite: 520 },
        /* Blackbutt is ground level only and spotted gum stops below high level - both stated in
           the fixture as sentences rather than as gaps in the table, and a reader that fills them
           in from the pattern has invented two rates. Their absence is not scored here; it is what
           the golden snapshot holds. */
        low_level: { treated_pine: 310, merbau: 455, spotted_gum: 480, composite: 560 },
        elevated: { treated_pine: 390, merbau: 540, spotted_gum: 570, composite: 650 },
        high_level: { treated_pine: 470, merbau: 640, composite: 760 },
      },
      /* `removals` is NOT counted, and that is a finding rather than an omission. "Disposal $550
         per job" lands in one of two defensible places across live runs - `removals` under the
         `any` slug three times in five, and an extra labelled "Disposal" the other two - because
         it is not a removal TYPE the way timber and composite decks are; it is the disposal charge
         that goes with one. The $550 is never lost either way, so nothing here is broken, and
         pinning a number would be scoring the model against a coin toss the fixture does not
         settle. Same treatment as the three tiling lines above. */
      counts: { balustrades: 5, stairs: 3, screens: 4, siteConditions: 3 },
    },
  },
  {
    /* A balustrade priced against the deck's floor area instead of its edge, and a business telling
       customers a permit is probably not needed - D4 and D7. Both are claims about somebody else's
       site, and both are the kind of thing a warm, experienced, well-written submission says. */
    file: 'description-THIN-decking.txt',
    trade: 'decking',
    approved: false,
  },
  {
    /* The sixth trade, and the one whose rate table is scored differently from every other here.
       A renovator's rates are keyed by ROOM and carry no unit at all - `rateAt` finds them through
       the `jobType` row name, which was added to `ROW_NAMES` for this trade.

       Ten rooms are scored and the strip-out rows are not, because a strip-out price is read twice
       on purpose: once as a `demolition_only` rate and once as a removal. `removals` below scores
       the same five figures in the place a wrong reading would lose them. */
    file: 'description-COMPLETE-renovation.txt',
    trade: 'home_renovation',
    approved: true,
    pricing: {
      gstIncluded: true,
      minimumCharge: 450,
      /* The letterhead, with its postcode - same as kitchen's and decking's, and for the same
         reason: the model reads the top of the document, and a postcode geocodes better. */
      baseLocation: 'Berwick VIC 3806',
      radiusKm: 30,
      rates: {
        bathroom: { full_renovation: 6850 },
        ensuite: { full_renovation: 5950 },
        kitchen: { full_renovation: 4850 },
        laundry: { full_renovation: 3850 },
        bedroom: { full_renovation: 2850 },
        living_room: { full_renovation: 3250 },
        dining_room: { full_renovation: 2450 },
        home_office: { full_renovation: 2750 },
        hallway: { full_renovation: 1850 },
        open_plan: { full_renovation: 8500 },
      },
      /* The five strip-out prices, scored here rather than in `rates`. This is the check that
         "Kitchen demolition $1,650" did not become the kitchen's renovation price - the failure
         that would quote a customer a whole new kitchen for the cost of taking the old one out. */
      /* Hand-read from the fixture and then CORRECTED against live, which was right where the
         offline reader was wrong. `surfaces` is 15 and not 19: cornice, skirting, skirting removal
         and architraves are priced per LINEAR metre, and a linear rate in a `pricePerSqm` field is
         wrong by a whole dimension. They belong in `extras`, carrying `per_metre` honestly.
         `perItem` is 9 and not 4 for the opposite reason - the offline reader needed the word
         "each" to see one, so it missed the cut-outs and the tap hole, which are per-item prices
         that simply do not say so. */
      /* `perItem` is NOT counted, and that is a finding rather than an omission. Five live runs of
         this fixture returned 3, 3, 9, 6 and 9 - the cut-outs, the tap hole and the door prices
         land in `perItem` or in `extras` depending on the run, because "Sink cut-out $180" is a
         per-item price that does not say so. Nothing is lost either way and no customer is affected
         - a per-item line can never enter a total in this trade - so pinning a number would be
         scoring the model against a coin toss the fixture does not settle. Same treatment as
         decking's `removals` and tiling's three ambiguous lines.
         `removals` IS counted, and stays at five whichever way the strip-out lines were read: the
         verifier reconciles the two homes of that one line rather than trusting the model to write
         it twice. That check is the point of counting it. */
      counts: { removals: 5, surfaces: 15, hourly: 5 },
    },
  },
  {
    /* Every price on the page is honest, firm and charged by the hour, and not one of them can
       answer "what does my bathroom cost". This trade's characteristic failure, and the tightest
       test in the suite of the rejectedNotQuotable wording: it produces exactly ONE fix. */
    file: 'description-BAD-renovation.txt',
    trade: 'home_renovation',
    approved: false,
  },
];
