import {
  CONDITIONS,
  GATE_TYPES,
  KITCHEN_BENCHTOPS,
  KITCHEN_EXTRAS,
  KITCHEN_JOB_TYPES,
  KITCHEN_REMOVES,
  KITCHEN_SIZES,
  KITCHEN_SUPPLY,
  MATERIALS,
  REMOVES,
  RW_CONDITIONS,
  RW_DRAINAGE,
  RW_EXTRAS,
  RW_REMOVES,
  RW_SUPPLY,
  RW_WALL_TYPES,
  TILE_CONDITIONS,
  TILE_JOB_TYPES,
  TILE_REMOVES,
  TILE_SUPPLY,
  TILE_TYPES,
  TILE_WATERPROOF,
  type Trade,
} from './vocab.js';

/**
 * Enum slugs are how the database stores it; nobody wants to read timber_pine on a screen.
 *
 * This map is sent with every approved submission so the frontend never keeps its own copy. A
 * second copy would drift from vocab.ts the first time a value is added, and nothing would report
 * the mismatch - the screen would just start showing a raw slug.
 */
/**
 * Slug -> the words a person reads. Grouped by field, because the customer-side chat needs to know
 * WHICH question a label belongs to - it cannot offer "Sloped block" as an answer to "what type of
 * fence".
 *
 * One definition, two consumers: this is published to `schema/{trade}.labels` for the customer
 * chat, and flattened into `LABELS` for the business-side response. A second hand-kept copy is
 * exactly the drift the closed vocabulary exists to prevent.
 */
export const LABEL_GROUPS = {
  materials: {
    timber_pine: 'Treated pine',
    timber_hardwood: 'Hardwood timber',
    colorbond: 'Colorbond',
    aluminium: 'Aluminium',
    pool_aluminium: 'Pool fencing — aluminium',
    pool_glass: 'Pool fencing — glass',
    chainmesh: 'Chainmesh',
    rural_wire: 'Rural wire',
  },
  gateTypes: {
    pedestrian_single: 'Single pedestrian gate',
    driveway_double: 'Double driveway gate',
    driveway_sliding: 'Sliding driveway gate',
    motor_automation: 'Motorised / automation',
  },
  conditions: {
    sloped: 'Sloped block',
    rock: 'Rocky ground',
    restricted_access: 'Restricted access',
    hand_dig: 'Hand dig needed',
  },
  removes: {
    timber: 'Timber fence',
    metal: 'Metal fence',
    // "any" is a business-side wildcard - "we take away whatever is there". It is not something a
    // customer can pick, so it is left out of what the chat is offered. See CUSTOMER_LABEL_GROUPS.
    any: 'Existing fence',
  },
  units: {
    per_metre: 'per metre',
    per_item: 'each',
    per_job: 'per job',
    per_sqm: 'per m2',
  },
} as const;

/** What the customer chat is given: the same labels, minus answers no customer can give. */
export const CUSTOMER_LABEL_GROUPS = {
  materials: LABEL_GROUPS.materials,
  gateTypes: LABEL_GROUPS.gateTypes,
  conditions: LABEL_GROUPS.conditions,
  /* "Yes" first, and the two kinds behind it. Somebody being asked "is there an old fence to
     remove?" is answering yes or no; which material it is made of is our pricing problem, not a
     question they should have to think about to say yes. Both are still here and still valid -
     they are on the next page, and a typed "the old one's timber" prices exactly. */
  removes: {
    any: 'Yes, take it away',
    timber: LABEL_GROUPS.removes.timber,
    metal: LABEL_GROUPS.removes.metal,
  },
};

/**
 * Tiling's words. Same job as `LABEL_GROUPS` above, for the second trade.
 *
 * The large-format sizes keep their millimetre names because that is what a customer is shown in a
 * tile shop and what is printed on the box - "Large format" alone would make four different prices
 * look like one choice.
 */
export const TILING_LABEL_GROUPS = {
  jobTypes: {
    bathroom: 'Bathroom',
    ensuite: 'Ensuite',
    laundry: 'Laundry',
    kitchen_splashback: 'Kitchen splashback',
    floor_only: 'Floor only',
    wall_only: 'Wall only',
    balcony: 'Balcony',
    outdoor: 'Outdoor area',
  },
  tileTypes: {
    ceramic: 'Ceramic',
    porcelain: 'Porcelain',
    large_format_600x1200: 'Large format 600×1200',
    large_format_900x900: 'Large format 900×900',
    large_format_1200x1200: 'Large format 1200×1200',
    large_format_1200x2400: 'Large format 1200×2400',
    large_format_600x600: 'Large format 600×600',
    large_format_800x800: 'Large format 800×800',
    subway: 'Subway',
    mosaic: 'Mosaic',
    glass_mosaic: 'Glass mosaic',
    feature_mosaic: 'Feature mosaic',
    natural_stone: 'Natural stone',
    terrazzo: 'Terrazzo',
    outdoor_porcelain: 'Outdoor porcelain',
    herringbone: 'Herringbone pattern',
  },
  supply: {
    labour_only: "I'm buying the tiles",
    supply_and_install: 'They supply the tiles',
  },
  removes: {
    any: 'Yes, take them up',
    ceramic: 'Ceramic tiles',
    porcelain: 'Porcelain tiles',
    stone: 'Stone tiles',
    mosaic: 'Mosaic tiles',
    adhesive: 'Adhesive only',
  },
  /* Answers to "does any of it need waterproofing?", so they read as answers rather than as a list
     of rooms. "Just the shower" is a real and common one - a shower is waterproofed when the rest
     of the bathroom floor is not. */
  waterproof: {
    bathroom: 'Yes, the bathroom',
    shower: 'Just the shower',
    ensuite: 'Yes, the ensuite',
    laundry: 'Yes, the laundry',
    balcony: 'Yes, the balcony',
  },
  conditions: {
    restricted_access: 'Hard to get to',
    second_storey: 'Upstairs',
    stairs: 'Stairs involved',
    small_room: 'Small room',
    uneven_substrate: 'Uneven floor',
  },
} as const;

export const KITCHEN_LABEL_GROUPS = {
  jobTypes: {
    new_kitchen: 'A brand new kitchen',
    replacement: 'Replacing the old one',
    install_only: "Fitting one I've bought",
  },
  /* Sizes read as answers to "roughly how big?", with the yardstick a customer can actually judge
     themselves against. A fitter's own list says small/standard/large and nothing more, which is
     no help to somebody standing in their kitchen wondering which one theirs is. */
  sizes: {
    small: 'Small — a galley or one run',
    standard: 'Standard — an L-shape',
    large: 'Large — a U-shape or an island',
  },
  supply: {
    labour_only: "I'm supplying the cabinets",
    supply_and_install: 'They supply the cabinets',
  },
  benchtops: {
    laminate: 'Laminate',
    timber: 'Timber',
    stone: 'Stone',
  },
  /* `any` and `full_demolition` sat next to each other as "Yes, take the old one out" and "The
     whole kitchen", which read as the same answer twice - seen on a live run. `any` is the one for
     somebody who has not thought about how much comes out; the rest name what does, so the fullest
     one has to SAY what it includes rather than repeat the word "kitchen". */
  removes: {
    any: 'Yes, take it out',
    full_demolition: 'Everything — cabinets, bench, splashback',
    cabinets_only: 'Just the cabinets',
    benchtop_only: 'Just the benchtop',
    splashback_only: 'Just the splashback',
  },
  prep: {
    wall_prep: 'Wall preparation',
    floor_prep: 'Floor preparation',
    floor_levelling: 'Floor levelling',
    plaster_repair: 'Plaster repair',
  },
  extras: {
    island: 'An island',
    pantry: 'A pantry',
    splashback_prep: 'Splashback preparation',
    appliance_integration: 'Built-in appliances',
    sink: 'A sink',
    laundry: 'Laundry cabinets too',
    appliance_garage: 'An appliance garage',
    open_shelving: 'Open shelving',
    pull_out_bin: 'A pull-out bin',
    corner_storage: 'Corner storage',
  },
} as const;

export const RW_LABEL_GROUPS = {
  /* Named by what a customer can SEE, with the trade word second. Almost nobody says "concrete
     sleeper system" standing in their own back yard - they say "those grey concrete ones". The
     builder's own word is kept in the label so the two halves of the marketplace still share a
     vocabulary, but it is not what has to be recognised first. */
  wallTypes: {
    timber_sleeper: 'Timber sleepers',
    premium_timber: 'Premium timber sleepers',
    concrete_sleeper: 'Concrete sleepers',
    steel_post: 'Steel posts with sleepers',
    timber_post: 'Timber posts with sleepers',
    tiered: 'Tiered — more than one level',
  },
  /* The clearest wording either trade has managed for this question, because here it is worth more
     than anywhere else: the gap between the two answers is $145 and $285 a metre. "Materials" and
     not "sleepers", because the answer also covers the posts, the concrete, the gravel and the
     ag-pipe - a customer who reads this as being about sleepers alone has agreed to buy a third of
     what they are about to be quoted for. */
  supply: {
    labour_only: "I'm buying the materials",
    supply_and_install: 'They supply the materials',
  },
  /* `any` first and the kinds behind it, the shape all three other trades use. Somebody looking at
     a failing wall knows it is timber or it is concrete; almost nobody knows whether the posts
     behind the sleepers are steel, and that is our pricing problem rather than their question. */
  removes: {
    any: 'Yes, take it out',
    timber_wall: 'An old timber wall',
    concrete_sleeper_wall: 'An old concrete sleeper wall',
    steel_post: 'Steel posts',
    timber_post: 'Timber posts',
  },
  /* `full_package` leads, because it is the answer to the question actually being asked. A customer
     saying "yes, do the drainage" is buying the builder's standard package, not choosing between
     ag-pipe and gravel - the components are here for a customer who has been told by somebody else
     exactly what they need. */
  drainage: {
    full_package: 'Yes — the standard drainage',
    ag_pipe: 'Ag-pipe',
    drainage_gravel: 'Drainage gravel',
    geotextile_fabric: 'Geotextile fabric',
    drainage_outlet: 'A drainage outlet',
  },
  groundworks: {
    excavation: 'Excavation',
    post_holes: 'Post holes',
    footings: 'Concrete footings',
    backfill: 'Backfill',
    compacted_backfill: 'Compacted backfill',
    soil_removal: 'Soil removal',
    site_cleanup: 'Site clean-up',
  },
  conditions: {
    restricted_access: 'Hard to get to',
    rock: 'Rocky ground',
    hard_clay: 'Hard clay',
    sloped: 'Sloping site',
    existing_structures: 'Structures nearby',
    machine_access: 'No machine access',
  },
  extras: {
    caps: 'Capping on top',
    steps: 'Steps',
    corners: 'Corners',
    returns: 'Returns',
    fence_post_interface: 'A fence on top',
    repairs: 'Repairs to an existing wall',
    delivery: 'Material delivery',
    site_inspection: 'A site inspection',
  },
  /* The two units no other trade has, and the only slugs a business screen was left unable to
     render. `LABEL_GROUPS.units` covers the four in the shared `UNITS` list; excavation by the hour
     and an excavator by the day exist only in this trade's groundworks and site conditions, so
     their words belong here rather than in the shared map every trade reads. */
  units: {
    per_hour: 'per hour',
    per_day: 'per day',
  },
  /**
   * The same two answers said to the BUILDER instead of to the customer, and assigned last in
   * `TRADE_LABELS` so it wins there.
   *
   * "I'm buying the materials" is right on a customer's chip and backwards on a builder's screen,
   * where "I" is the builder and the line is the heading over their own rate table - it says the
   * opposite of what it means. This matters more here than in any other trade: the supply model is
   * not a field on a form, it is which of two whole price lists the builder is looking at.
   *
   * Said as what the WORK is rather than as who pays, because that is what a builder is checking:
   * one table is their labour and the other is labour with materials in it.
   */
  supplyFactual: {
    labour_only: 'Installation only — customer supplies the materials',
    supply_and_install: 'Supply and install — you supply the materials',
  },
} as const;

/**
 * What the chat may OFFER, per trade, in the order it offers them.
 *
 * Not the same list as `TRADE_VOCAB` even for fencing, and the difference is the point: `removes`
 * leads with the business-side wildcard `any` because the question is a yes/no one, while the
 * vocabulary lists it last. A customer-facing order is a customer-facing decision.
 *
 * Every value here should also have a label below it; one without is offered as a title-cased slug.
 */
export const CUSTOMER_CORE: Record<Trade, Record<string, string[]>> = {
  fencing: {
    materials: [...MATERIALS],
    gateTypes: [...GATE_TYPES],
    conditions: [...CONDITIONS],
    removes: ['any', ...REMOVES.filter((r) => r !== 'any')],
  },
  tiling: {
    /* Ordered for the screen, not for the vocabulary. Three choices are shown at a time, so the
       three commonest jobs go first - a bathroom, a plain floor, a kitchen splashback - and the
       rest follow on the next page. The vocabulary's own order groups the rooms together, which is
       the right order to read a list in and the wrong one to be offered three of. */
    jobTypes: [
      'bathroom',
      'floor_only',
      'kitchen_splashback',
      ...TILE_JOB_TYPES.filter((j) => j !== 'bathroom' && j !== 'floor_only' && j !== 'kitchen_splashback'),
    ],
    /* Materials first, because the first page is three chips and a customer looking at their own
       floor knows what it is MADE of long before they know what it MEASURES. The sizes are still
       one page away and still matter - a business prices large format as its own row - but leading
       with one of them put "Large format 600x1200" beside "Ceramic" as though they answered the
       same question. Ordered here rather than in the vocabulary, which is also the business side's
       and must not be reshuffled for a screen. */
    tileTypes: [
      'ceramic',
      'porcelain',
      'natural_stone',
      ...TILE_TYPES.filter((t) => t !== 'ceramic' && t !== 'porcelain' && t !== 'natural_stone'),
    ],
    supply: [...TILE_SUPPLY],
    /* Same shape as fencing's: "yes, take them up" first, and the kinds behind it for anyone who
       knows which they have. `adhesive` is left off - it is a business-side line, not something a
       customer looking at a tiled floor would ever pick. */
    removes: ['any', ...TILE_REMOVES.filter((r) => r !== 'any' && r !== 'adhesive')],
    waterproof: [...TILE_WATERPROOF],
    conditions: [...TILE_CONDITIONS],
  },
  kitchen: {
    jobTypes: [...KITCHEN_JOB_TYPES],
    sizes: [...KITCHEN_SIZES],
    supply: [...KITCHEN_SUPPLY],
    benchtops: [...KITCHEN_BENCHTOPS],
    /* The wildcard first, as in both other trades: somebody replacing a kitchen knows there is one
       there and has not thought about whether the benchtop comes out on its own. The specific
       answers follow for anyone who has. */
    removes: ['any', ...KITCHEN_REMOVES.filter((r) => r !== 'any')],
    /* `prep` is deliberately absent. Whether a floor needs levelling is not something a customer
       can see, and asking them to decide it produces a wrong answer rather than a missing one - it
       comes off the fitter's own site measure. It stays in the vocabulary because BUSINESSES price
       it, and `WHAT_TO_SEND` asks them to. */
    extras: [...KITCHEN_EXTRAS],
  },
  retaining_wall: {
    /* Timber and concrete sleepers lead because they are most of this trade - the two cheapest and
       two commonest systems - and `tiered` goes last despite being a real rate, because it is the
       one answer a customer picks by looking at their SITE rather than at a catalogue. */
    wallTypes: [
      'timber_sleeper',
      'concrete_sleeper',
      'steel_post',
      ...RW_WALL_TYPES.filter((w) => w !== 'timber_sleeper' && w !== 'concrete_sleeper' && w !== 'steel_post'),
    ],
    supply: [...RW_SUPPLY],
    removes: ['any', ...RW_REMOVES.filter((r) => r !== 'any')],
    drainage: ['full_package', ...RW_DRAINAGE.filter((d) => d !== 'full_package')],
    conditions: [...RW_CONDITIONS],
    extras: [...RW_EXTRAS],
    /* `groundworks` is deliberately absent, for the reason kitchen leaves out `prep`: whether a
       site needs an excavator or a shovel, and how deep the footings go, is not something a
       customer standing in their garden can decide. Asking produces a wrong answer rather than a
       missing one - it comes off the builder's own site inspection. It stays in the vocabulary
       because BUSINESSES price it, and `WHAT_TO_SEND` asks them to. */
  },
};

/** The same, for the words. Keyed by trade so a second trade brings its own and touches nothing. */
export const CUSTOMER_LABELS: Record<Trade, Record<string, Record<string, string>>> = {
  fencing: CUSTOMER_LABEL_GROUPS,
  tiling: TILING_LABEL_GROUPS,
  kitchen: KITCHEN_LABEL_GROUPS,
  retaining_wall: RW_LABEL_GROUPS,
};

/** Flattened, for the business-side response. Derived - never edited by hand. */
export const LABELS: Record<string, string> = Object.assign({}, ...Object.values(LABEL_GROUPS));

/**
 * The same, per trade, and this one matters: the response tells a business's own screen how to
 * read its slugs. Handing a tiler fencing's map means `porcelain` and `bathroom` render as raw
 * slugs while `timber_pine` renders beautifully - on a screen no fencing word belongs on.
 */
export const TRADE_LABELS: Record<Trade, Record<string, string>> = {
  fencing: LABELS,
  /* Order matters here in a way it does not for fencing, because tiling's slugs REPEAT across
     groups: `bathroom` is both a job and a wet area, `ceramic` is both a tile and something being
     taken up. Flattening loses that, so the factual naming wins and the customer-chat phrasing goes
     first to be overwritten - a business screen should read "Bathroom", never "Yes, the bathroom".
     The lasting fix is a screen that renders each section from its own group; see
     docs/TILING-FRONTEND.md §2.1. */
  tiling: Object.assign(
    {},
    TILING_LABEL_GROUPS.waterproof,
    TILING_LABEL_GROUPS.removes,
    TILING_LABEL_GROUPS.supply,
    TILING_LABEL_GROUPS.conditions,
    TILING_LABEL_GROUPS.tileTypes,
    TILING_LABEL_GROUPS.jobTypes,
    LABEL_GROUPS.units,
  ) as Record<string, string>,
  /* Same trap as tiling's, and worse: `island`, `pantry` and `sink` are all extras a customer picks
     AND lines a business prices, and `splashback_prep` sits next to `splashback_only`. The
     customer-chat phrasing goes first to be overwritten, so a fitter's own screen reads "The whole
     kitchen", never "Yes, take the old one out". */
  kitchen: Object.assign(
    {},
    KITCHEN_LABEL_GROUPS.removes,
    KITCHEN_LABEL_GROUPS.supply,
    KITCHEN_LABEL_GROUPS.sizes,
    KITCHEN_LABEL_GROUPS.extras,
    KITCHEN_LABEL_GROUPS.prep,
    KITCHEN_LABEL_GROUPS.benchtops,
    KITCHEN_LABEL_GROUPS.jobTypes,
    LABEL_GROUPS.units,
  ) as Record<string, string>,
  /* The same trap once more: `steel_post` and `timber_post` are each a wall system a builder prices
     per metre AND a thing being pulled out at a price per post. `wallTypes` is assigned LAST
     because the rate table is most of a builder's screen - a row keyed `steel_post` there has to
     read "Steel posts with sleepers", not "Steel posts", which is what the same slug means in the
     removals list one section below it. */
  retaining_wall: Object.assign(
    {},
    RW_LABEL_GROUPS.removes,
    RW_LABEL_GROUPS.supply,
    RW_LABEL_GROUPS.drainage,
    RW_LABEL_GROUPS.groundworks,
    RW_LABEL_GROUPS.conditions,
    RW_LABEL_GROUPS.extras,
    RW_LABEL_GROUPS.wallTypes,
    LABEL_GROUPS.units,
    RW_LABEL_GROUPS.units,
    /* LAST, so it overwrites the customer-chat phrasing of the same two slugs - the pattern
       `TRADE_LABELS` already uses for tiling's `bathroom` and kitchen's `full_demolition`. */
    RW_LABEL_GROUPS.supplyFactual,
  ) as Record<string, string>,
};

/**
 * The question the customer chat asks for each field it has to fill. Here rather than in the chat
 * so the wording changes in one place, and so a new trade brings its own questions with it.
 */
export const QUESTIONS: Record<string, string> = {
  material: 'What type of fence are you after?',
  heightKey: 'What height are you after?',
  lengthMeters: 'How long is the fence?',
  removal: 'Is there an old fence to remove?',
  conditions: 'Anything tricky about the site?',
  gateType: 'Do you need any gates?',
  gateQty: 'How many of those gates?',
};

export const TILING_QUESTIONS: Record<string, string> = {
  jobType: 'What are you having tiled?',
  tileType: 'What tile are you using?',
  /* "Roughly" on purpose. A customer who has not measured will otherwise stall on a question they
     cannot answer exactly, and every quote in this trade is confirmed on site anyway. */
  areaSqm: 'Roughly how many square metres?',
  supply: "Who's buying the tiles?",
  removal: 'Are there old tiles to take up?',
  waterproofing: 'Does any of it need waterproofing?',
  conditions: 'Anything tricky about the site?',
};

/** Per trade, for the same reason as the lists above: fencing's wording is fencing's. */
export const KITCHEN_QUESTIONS: Record<string, string> = {
  jobType: 'What are you having done?',
  /* "Roughly" for the same reason tiling's area question carries it: a fitter measures the kitchen
     on site and everything is confirmed there, so a customer who stalls trying to be exact is
     stalling over something we were never going to use as given. */
  kitchenSize: 'Roughly how big is the kitchen?',
  supply: "Who's supplying the cabinets?",
  benchtop: 'What benchtop are you after?',
  removal: 'Is there an old kitchen to take out?',
  extras: 'Anything else in the job?',
};

export const RW_QUESTIONS: Record<string, string> = {
  wallType: 'What sort of retaining wall are you after?',
  /* The question this trade turns on, and the one customers do not know is a question - the two
     answers are $145 and $285 a metre for the same wall. "Materials" rather than "sleepers"
     because the answer also covers the posts, the concrete and the drainage gravel. */
  supply: "Who's buying the materials?",
  lengthMeters: 'How long is the wall?',
  /* Height is asked of every caller because the SOP requires it - it decides whether engineering
     and council approval come into it - even where the builder publishes one rate for every
     height. "Roughly" and "hold back", because a customer measures the drop they can see rather
     than the wall that has not been built yet. */
  heightKey: 'Roughly how high does it need to hold back?',
  removal: 'Is there an old wall to take out?',
  drainage: 'Do you want drainage behind it?',
  conditions: 'Anything tricky about the site?',
};

export const TRADE_QUESTIONS: Record<Trade, Record<string, string>> = {
  fencing: QUESTIONS,
  tiling: TILING_QUESTIONS,
  kitchen: KITCHEN_QUESTIONS,
  retaining_wall: RW_QUESTIONS,
};

/**
 * What a customer is told when nobody near them can quote the brief.
 *
 * Here rather than in `priceAndRank.ts` for the same reason every other customer-facing sentence
 * is here: these are words, and words belong to a trade. "The businesses near you do not offer that
 * fence type" is not a sentence a tiling customer should ever see.
 *
 * The reasons are the shared ones the pricing code counts. Which of a trade's own blockers maps
 * onto which reason is that trade's business - tiling has no gates, and its `height` is the job it
 * could not price.
 */
/**
 * The trade in a sentence: what the work is called, and what one job of it is.
 *
 * Small, and it earns its place three times over - an image search that appends the wrong noun
 * returns pictures of the wrong trade, a spoken unit read as metres understates a floor by the
 * width of the room, and an opening line that says fencing to a tiling customer is simply wrong.
 */
export const TRADE_WORDS: Record<
  Trade,
  {
    trade: string;
    noun: string;
    mentions: RegExp;
    /** The job with its article, for the middle of a sentence: "is it a fence you're after?" */
    article: string;
    /** What one of these businesses is called, singular: a fencer, a tiler. */
    tradesperson: string;
  }
> = {
  /* `mentions` is spelled out rather than derived from `noun`. Stemming "fence" and "tiles" to
     something that matches both the noun and the trade word lands on "fenc" and "til" - and "til"
     matches "until". An explicit pattern per trade is two lines and cannot surprise anyone.

     `article` and `tradesperson` are spelled out for the same reason: English does not derive
     either one. "a fence" and "some tiling" take different articles, and a fencer is not a
     "fencinger". Every sentence that used to hardcode "fence" or "fencer" now asks here. */
  fencing: { trade: 'fencing', noun: 'fence', mentions: /fenc/i, article: 'a fence', tradesperson: 'fencer' },
  tiling: { trade: 'tiling', noun: 'tiles', mentions: /tile|tiling/i, article: 'tiling', tradesperson: 'tiler' },
  /* `tradesperson` is "kitchen fitter" rather than "kitchen renovator" or "cabinetmaker": it is
     what these businesses call themselves, and it is also honest about the scope. Beky Kitchens
     fits and supplies cabinetry; the electrical, gas and plumbing are somebody else's. */
  kitchen: {
    trade: 'kitchen fitting',
    noun: 'kitchen',
    mentions: /kitchen|cabinetr|cabinet/i,
    article: 'a kitchen',
    tradesperson: 'kitchen fitter',
  },
  /* `trade` is SINGULAR where every other trade's is a gerund, because this one has no gerund
     anybody says - "retaining walling" is not a word and "retaining" alone names nothing. Singular
     rather than plural because every caller puts a noun after it: `askWhichTrade` builds "Are you
     looking for Fencing, Tiling, Kitchen fitting or Retaining wall services?", and "Retaining walls
     services" is the version a test caught.

     `tradesperson` is "retaining wall builder" and not "landscaper" deliberately. The SOP is
     emphatic that a wall is a structural system, not a landscaping product, and the word a customer
     is given shapes what they think they are buying. `mentions` stays off the bare word `wall` for
     the same reason `TRADE_KEYWORDS` does - it belongs to tiling as much as to this trade. */
  retaining_wall: {
    trade: 'retaining wall',
    noun: 'retaining wall',
    mentions: /retaining|sleeper wall/i,
    article: 'a retaining wall',
    tradesperson: 'retaining wall builder',
  },
};

export const NO_MATCH_MESSAGES: Record<Trade, Record<string, string>> = {
  fencing: {
    area: 'No fencing business covers that suburb yet. Try a nearby suburb?',
    removal: 'None of the businesses near you take away that kind of old fence. Want to arrange the removal separately?',
    gate: 'Nobody near you prices that gate. Want to try without the gate?',
    height: 'Nobody near you publishes a rate at that height. Want to try a different height?',
    material: 'The businesses near you do not offer that fence type yet. Want to try a different type?',
    pricing: 'I found businesses near you, but none of them have finished setting up their pricing yet.',
  },
  tiling: {
    area: 'No tiling business covers that suburb yet. Try a nearby suburb?',
    removal: 'None of the tilers near you take up that kind of old tile. Want to arrange the removal separately?',
    gate: 'Nobody near you prices that part of the job. Want to try without it?',
    height: 'Nobody near you publishes a price for that job. Want to try a different one?',
    material: 'The tilers near you do not lay that tile yet. Want to try a different one?',
    pricing: 'I found tilers near you, but none of them have finished setting up their pricing yet.',
  },
  /* The keys are fencing's - `gate`, `height`, `material` - because they name the SHAPE of the
     failure rather than a fence part: something in the brief nobody prices, something at that size,
     something of that kind. Renaming them would be a wire change across three trades to make one
     table read better. `height` is kitchen's size, `material` its benchtop. */
  kitchen: {
    area: 'No kitchen fitter covers that suburb yet. Try a nearby suburb?',
    removal: 'None of the fitters near you take out an old kitchen. Want to arrange that separately?',
    gate: 'Nobody near you prices that part of the job. Want to try without it?',
    height: 'Nobody near you publishes a price for a kitchen that size. Want to try a different one?',
    material: 'The fitters near you do not install that benchtop yet. Want to try a different one?',
    pricing: 'I found kitchen fitters near you, but none of them have finished setting up their pricing yet.',
  },
  /* Same fixed keys, naming the SHAPE of the failure rather than a fence part - and this trade
     repurposes one of them further than the others do. `material` is the wall system, as it is for
     kitchen's benchtop. `height` is THE SUPPLY MODEL here, not a height: a wall this trade cannot
     price at a given height does not exist, because the rate lookup falls back to the dearest band
     the builder published rather than refusing, so that slot was free. What genuinely blocks a
     quote instead is a builder who builds the wall but not the way the customer asked - they
     install customer-supplied materials and do not supply them, or the reverse - and telling that
     customer "nobody builds that kind of wall" is false as well as unhelpful: the builder does
     build it, and the answer is one question away. */
  retaining_wall: {
    area: 'No retaining wall builder covers that suburb yet. Try a nearby suburb?',
    removal: 'None of the builders near you take out that kind of old wall. Want to arrange the removal separately?',
    gate: 'Nobody near you prices that part of the job. Want to try without it?',
    height: 'The builders near you do that wall, but not with the materials supplied the way you asked. Want to change who buys them?',
    material: 'The builders near you do not build that kind of wall yet. Want to try a different one?',
    pricing: 'I found retaining wall builders near you, but none of them have finished setting up their pricing yet.',
  },
};

export const MESSAGES = {
  approved: {
    opening: 'Your details have been approved. Below is what we have saved from them.',
    nextStep:
      'Check the figures. If they are right, confirm them and your profile goes live for customers. If something is wrong, update your details and send them through again, or use the contact button below if you need a hand.',
  },
  nothingUsable: {
    opening: 'Your details came through, but we could not match any of your rates back to what you wrote.',
    nextStep:
      'Write your rates out with the number and the unit together - for example "Colorbond 1.8m - $110 per metre" - and send them through again. If you would rather talk it through, use the contact button below.',
  },
  notAPriceList: {
    opening:
      'This page is for your pricing, and we could not find any in what you sent. Here is what we need before your profile can go live.',
    nextStep:
      'Type it in, or attach your price list as a PDF or a photo - whichever is easier. If you are not sure about any of it, use the contact button below and one of our team will walk you through it.',
  },
  rejected: {
    opening: 'We have been through the details you sent. A few things need updating before your profile can go live.',
    nextStep:
      'Update your details and send them through again for approval. If something above does not look right, use the contact button below and one of our team will go through it with you.',
  },
  failed: {
    opening:
      'Something went wrong on our end reading your details. Nothing you sent has been lost — send it through again, or use the contact button and we will sort it out.',
    nextStep: 'Send your details through again, or use the contact button below and we will sort it out.',
  },
} as const;

/**
 * What to send, when they sent nothing usable. Taken from the blocking rules in
 * prompts/sop/_general.md and prompts/sop/fencing/rules.md - the same rules the review stage
 * judges against, so nobody is asked for one thing and marked against another.
 *
 * Written here rather than by the model: it is the same list every time, and a business staring at
 * an empty form needs the shape of a right answer, not a sentence telling them to try again.
 */
export const WHAT_TO_SEND: Record<Trade, { need: string[]; helpful: string[]; example: string }> = {
  fencing: {
    need: [
      'Each fence type you install, and your price per metre at every height you do it at',
      'Gate prices - single and double separately (or say you do not fit gates)',
      'What you charge per metre to pull down and take away an old fence',
      'Any extra for sloped blocks, rock or tight access - a figure or a percentage (or say you charge none)',
      'How you build: post size and material, spacing, depth, hole diameter, footings, rails per bay, capping',
      'Whether your prices include GST',
      'The suburb or postcode you work out from, and how far you travel',
      'The smallest job you will take on, and what you charge for it',
      'Who arranges and pays for council permits, and any fee',
      'How long your workmanship is warranted for',
    ],
    helpful: [
      'Anything not included in your prices - painting, stump removal, engineering drawings',
      'Pool fencing: your AS 1926.1 position and whether a compliance certificate is included',
      'Areas inside your radius that you do not travel to',
    ],
    example: [
      'TREATED PINE',
      '1.8m high - $85 per metre',
      '2.1m high - $104 per metre',
      '',
      'COLORBOND',
      '1.8m high - $110 per metre',
      '',
      'Gates: single pedestrian $480, double driveway $1,340.',
      'Removal of an old timber fence: $18 per metre.',
      'Sloped blocks +10%. Rock or hand-dig +$22/m. Restricted access +$9/m.',
      '',
      'HOW WE BUILD',
      'Posts 100x100mm H4 treated pine at 2.4m centres, 700mm deep in concrete,',
      'hole diameter 300mm. Three rails of 75x50mm per bay. Capping 150x25mm.',
      '',
      'All prices include GST. Based in Berwick, we travel 30km. Minimum charge $850.',
      'Council permits are the customer\'s responsibility. Workmanship warranted 7 years.',
    ].join('\n'),
  },

  /* Taken from the blocking rules T1-T9 in prompts/sop/tiling/rules.md, in the same order, so a
     business reading this and a reviewer judging it are working from one list. */
  tiling: {
    need: [
      'Each tile type you lay and your price per square metre - floor and wall separately',
      'Large format by size and mosaic on their own lines (or say you do not do them)',
      'Preparation priced separately - surface prep, levelling, screeding, adhesive removal (or say it is quoted on site)',
      'What you charge per square metre to take up existing tiles, by what is being removed',
      'Waterproofing, priced per wet area - bathroom, ensuite, shower (or say you do not do it)',
      'Whether you supply the tiles, install the customer\'s own, or both - and your tile prices per m2 if you supply',
      'Your minimum job charge, any call-out or inspection fee, and any travel charge',
      'The suburb or postcode you work out from, and how far you travel',
      'Whether your prices include GST',
    ],
    helpful: [
      'What a standard quote includes - adhesive, grout, silicone, standard cutting, clean-up',
      'What it does not - plumbing, electrical, shower screens, asbestos, structural repairs',
      'How you handle variations when the substrate turns out worse than it looked',
      'Your workmanship warranty, in your own words',
    ],
    example: [
      'FLOOR TILING (per m2)',
      'Standard - $65    Porcelain - $72    Natural stone - $125',
      '600x1200 - $88    900x900 - $95     1200x1200 - $110',
      '',
      'WALL TILING (per m2)',
      'Standard - $68    Subway - $78      Mosaic - $120',
      '',
      'PREPARATION',
      'Surface preparation $350. Floor levelling $650. Screeding $480.',
      'Adhesive removal $380. Extra substrate repair $95 per hour.',
      '',
      'TILE REMOVAL (per m2)',
      'Ceramic $45. Porcelain $55. Stone $75.',
      '',
      'WATERPROOFING',
      'Bathroom $950. Ensuite $850. Shower only $550. Laundry $650.',
      '',
      'We supply tiles or lay tiles you buy yourself - the labour rate is the same either way.',
      'Our tiles run $32 to $125 per m2 depending on the range.',
      '',
      'All prices include GST. Based in Pakenham, we travel 25km.',
      'Minimum job $350. Site inspection $95. Travel outside our area $75.',
      'Workmanship warranty as per contract.',
    ].join('\n'),
  },

  /* Taken from the blocking rules K1-K9 in prompts/sop/kitchen/rules.md, in the same order, for the
     same reason: a business reading this and a reviewer judging it must be working from one list.
     The example is a kitchen fitter's real shape - a price for the whole job, then everything else
     itemised - because that is what this trade's price lists actually look like and a form that
     asks for a rate per metre would get a blank. */
  kitchen: {
    need: [
      'Your installation price for a kitchen, by size - small, standard and large - or per cabinet',
      "Whether you supply the cabinetry, install the customer's own, or both - and your cabinetry package prices if you supply",
      'What you charge to take out an old kitchen - full demolition, cabinets only, benchtop, splashback, disposal',
      'Benchtop installation priced by material - laminate, timber, stone (or say you do not install them)',
      'Preparation priced separately - wall preparation, floor levelling, plaster repair (or say it is quoted on site)',
      'The extras you offer, each with a price - island, pantry, splashback preparation, appliance cut-outs, sink, laundry cabinetry',
      'Your minimum charge, any site measure or consultation fee, and any travel charge',
      'The suburb or postcode you work out from, and how far you travel',
      'Whether your prices include GST',
    ],
    helpful: [
      'What a standard installation includes - levelling, fixing, fillers, kickboards, doors, drawers, final adjustment',
      'What it does not - electrical, gas, plumbing, stone fabrication, appliance supply',
      "How you handle a customer-supplied kitchen that arrives incomplete, and any return attendance charge",
      'Your hourly rate for variations, and your workmanship warranty in your own words',
    ],
    example: [
      'KITCHEN INSTALLATION',
      'Small - $1,950    Standard - $2,850    Large - $4,250',
      'Per cabinet: base $180, wall $165, tall $280, drawer unit $190.',
      'Flat-pack assembly: base $95, wall $85, tall $145, drawer $125 each.',
      '',
      'CABINETRY WE SUPPLY',
      'Standard custom kitchen package $8,950. Standard pantry supplied and installed $1,250.',
      "We also install kitchens the customer buys themselves - the installation price is the same.",
      '',
      'REMOVAL',
      'Full kitchen demolition $1,650. Cabinet removal $950. Benchtop removal $380.',
      'Splashback removal $420. Disposal $650.',
      '',
      'BENCHTOPS',
      'Laminate $850. Timber $1,150. Stone $1,250. Sink cut-out $180. Cooktop cut-out $220.',
      '',
      'PREPARATION',
      'Minor wall preparation $350. Floor levelling $650. Plaster repair $420.',
      '',
      'EXTRAS',
      'Island $650. Pantry install $420. Splashback preparation $480. Sink $320.',
      'Dishwasher preparation $220. Oven cabinet $280. Laundry cabinetry $1,850.',
      '',
      'All prices include GST. Based in Pakenham, we travel 30km.',
      'Minimum installation $450. Site measure $120. Travel outside our area $85.',
      'Variations $95 per hour. Workmanship warranty as per contract.',
    ].join('\n'),
  },
  /* Taken from the blocking rules R1-R9 in prompts/sop/retaining_wall/rules.md, in the same order,
     for the same reason as the other three: a business reading this and a reviewer judging what
     they send have to be working from one list, or they get rejected for sending exactly what they
     were asked for.

     The first two lines carry most of the weight. A builder who publishes one column of per-metre
     rates and never says which supply model they belong to has given us a number we cannot use -
     $185 a metre is a bargain with the sleepers included and ordinary without, and there is no way
     to tell from the figure. The example shows both columns side by side for that reason. */
  retaining_wall: {
    need: [
      'Your rate per linear metre for every wall system you build — timber sleeper, concrete sleeper, steel post, timber post',
      'Whether you supply the materials, install the customer’s own, or both — and a separate per-metre rate for each model you offer',
      'Either a rate for each height band you build at, or a line saying one rate covers every height you build',
      'What you charge for drainage — ag-pipe, gravel, fabric, outlets, or a complete drainage package at one price',
      'What you charge to remove and dispose of an existing wall, per metre or per post, and the disposal charge',
      'Excavation, post holes and footings — a figure, an hourly or per-post rate, or a line saying it is quoted after inspection',
      'Where you stand on engineering and council approval — who arranges it, who pays, and what it costs if you do',
      'Your minimum charge, any site inspection fee, and any travel charge outside your area',
      'The suburb or postcode you work out from, how far you travel, and whether your prices include GST',
    ],
    helpful: [
      'What a standard installation includes — set-out, excavation, posts, concreting, sleepers, backfill, clean-up',
      'What it does not — engineering certificates, soil disposal beyond an allowance, landscaping, fencing on top',
      'Your prices for caps, steps, corners and returns, and for repairs to an existing wall',
      'How you handle a job where the customer’s own materials turn up short or wrong, and any return attendance charge',
      'Your hourly rate for variations, and your workmanship warranty in your own words',
    ],
    example: [
      'INSTALLATION ONLY — you supply the materials, we build it',
      'Timber sleeper $145 per metre. Timber post $155 per metre.',
      'Concrete sleeper $185 per metre. Steel post $195 per metre.',
      '',
      'SUPPLY AND INSTALL — we supply everything',
      'Timber sleeper $285 per metre. Premium timber $325 per metre.',
      'Concrete sleeper $395 per metre. Steel post with concrete sleepers $425 per metre.',
      'Tiered walls $450 per metre.',
      'These rates cover every height we build, from 300mm up to 1.5m.',
      '',
      'DRAINAGE',
      'Complete standard drainage package $650.',
      'Or priced separately: ag-pipe $55 per metre, drainage gravel $85 per metre,',
      'geotextile fabric $35 per metre, drainage outlet $180 each.',
      '',
      'REMOVAL AND DISPOSAL',
      'Timber wall removal $85 per metre. Concrete sleeper wall removal $125 per metre.',
      'Steel post removal $95 per post. Timber post removal $75 per post.',
      'Timber disposal $480. Concrete disposal $650. Soil disposal $720.',
      '',
      'GROUNDWORKS',
      'Manual excavation $95 per hour. Mini excavator $850 per day plus $350 mobilisation.',
      'Standard post hole $75 per post, difficult ground $125 per post.',
      'Standard footing $95 per post, heavy duty $145 per post.',
      'Backfill $75 per metre, compacted $95 per metre. Site clean-up $250.',
      '',
      'ENGINEERING AND APPROVALS',
      'Walls over 1m generally need engineering and a building permit. We arrange the engineering',
      'from $850; council fees are the customer’s. Excluded unless the quote says otherwise.',
      '',
      'EXTRAS',
      'Timber cap $65 per metre. Concrete cap $95 per metre. Decorative cap $125 per metre.',
      'Steps $450 each. Standard corner $180. Return $220. Fence post interface $180 per section.',
      '',
      'All prices include GST. Based in Berwick, we travel 30km.',
      'Minimum installation $650. Site inspection $150. Travel outside our area $95.',
      'Variations $110 per hour. Ten year workmanship warranty.',
    ].join('\n'),
  },
};
