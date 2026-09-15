import {
  CONDITIONS,
  DECK_ATTACHMENT,
  DECK_BALUSTRADES,
  DECK_CONDITIONS,
  DECK_EXTRAS,
  DECK_HEIGHTS,
  DECK_MATERIALS,
  DECK_REMOVES,
  DECK_SCREENS,
  DECK_STAIRS,
  GATE_TYPES,
  KITCHEN_BENCHTOPS,
  KITCHEN_EXTRAS,
  KITCHEN_JOB_TYPES,
  KITCHEN_REMOVES,
  KITCHEN_SIZES,
  KITCHEN_SUPPLY,
  MATERIALS,
  REMOVES,
  RENO_CONDITIONS,
  RENO_EXTRAS,
  RENO_JOB_TYPES,
  RENO_REMOVES,
  RENO_SUPPLY,
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
  /* Prep is priced by the tiler and never asked of a customer, so these are named the way a tiler
     writes them on their own list. Added when a per-trade label sweep found `pricing.prep[].type`
     was the one thing in a tiling response with no label behind it at all - a business screen that
     falls back to the raw slug was printing `floor_levelling` to the person who priced it. */
  prep: {
    surface_prep: 'Surface preparation',
    floor_grinding: 'Floor grinding',
    primer: 'Primer',
    floor_levelling: 'Floor levelling',
    screeding: 'Screeding',
    adhesive_removal: 'Adhesive removal',
    rubbish_removal: 'Rubbish removal',
    crack_treatment: 'Crack treatment',
  },
  /* Prep is the one thing this trade can price by the hour - `TILE_PREP` rates carry `per_hour` in
     the extraction schema - and the shared `UNITS` list does not, so without this a tiler's own
     screen shows `per_hour`. Found by a per-trade label sweep, not by a failure: a missing label is
     silent all the way to the screen. */
  units: {
    per_hour: 'per hour',
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
  /* Kitchen prep is priced by the hour on some lists - the extraction schema allows it - and the
     shared `UNITS` list carries only the four flat ones. Same sweep, same silence as tiling's. */
  units: {
    per_hour: 'per hour',
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
  /* `LABEL_GROUPS.units` covers the four in the shared `UNITS` list; excavation by the hour and an
     excavator by the day are this trade's groundworks and site conditions, so their words belong
     here rather than in the shared map every trade reads.
     NOT the only trade billing by the hour, which an earlier version of this comment claimed and
     tiling and kitchen both disprove - their prep rates carry `per_hour` too, and the claim is why
     neither had a label for it until a per-trade sweep went looking. Only `per_day` is this
     trade's and decking's alone. */
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

export const DECK_LABEL_GROUPS = {
  /* Heights named by what a customer can SEE from their back door, with the trade's own band second
     where it helps. Nobody knows whether their deck is "low level"; everybody knows whether they
     would step down onto the grass or need stairs. */
  heights: {
    ground_level: 'On the ground — step straight out',
    low_level: 'A step or two up',
    elevated: 'Up high — needs stairs',
    high_level: 'Well off the ground — a storey or so',
  },
  materials: {
    treated_pine: 'Treated pine',
    merbau: 'Merbau',
    spotted_gum: 'Spotted gum',
    blackbutt: 'Blackbutt',
    jarrah: 'Jarrah',
    composite: 'Composite',
    pvc: 'PVC',
  },
  attachment: {
    attached: 'Attached to the house',
    freestanding: 'Standing on its own',
  },
  balustrades: {
    timber: 'Timber',
    aluminium: 'Aluminium',
    steel: 'Steel',
    glass: 'Glass',
    wire: 'Wire balustrade',
    composite: 'Composite balustrade',
  },
  screens: {
    timber_batten: 'Timber battens',
    hardwood: 'Hardwood screen',
    merbau: 'Merbau screen',
    aluminium: 'Aluminium battens',
    composite: 'Composite screen',
  },
  stairs: {
    timber: 'Standard timber stairs',
    hardwood: 'Hardwood stairs',
  },
  /* `any` first, as in all four other trades: somebody replacing a deck knows one is there and has
     not looked at what the frame underneath is made of. */
  removes: {
    any: 'Yes, take it out',
    timber_deck: 'An old timber deck',
    composite_deck: 'An old composite deck',
  },
  conditions: {
    restricted_access: 'Hard to get to',
    rock: 'Rocky ground',
    roots: 'Tree roots',
    poor_soil: 'Soft or unstable soil',
    sloped: 'Sloping ground',
    existing_concrete: 'Concrete in the way',
  },
  extras: {
    stairs: 'Stairs',
    handrails: 'Handrails',
    skirting: 'Skirting underneath',
    seating: 'Built-in seating',
    planter_boxes: 'Planter boxes',
    access_hatch: 'An access hatch',
    pergola: 'A pergola over it',
    lighting: 'Deck lighting',
    oiling: 'Oiling',
    sanding: 'Sanding',
    restoration: 'Restoring an old deck',
    repairs: 'Repairs',
    design: 'Design',
    engineering_coordination: 'Engineering',
    permit_coordination: 'Permit coordination',
  },
  /**
   * The same slugs said to the BUILDER, and assigned last in `TRADE_LABELS` so they win there.
   *
   * This trade has the worst case of the repeated-slug trap in the product: `timber`, `merbau`,
   * `composite` and `aluminium` are each a deck MATERIAL, a BALUSTRADE type and a SCREEN type, and
   * `hardwood` is both a screen and a word for three of the materials. Flattened, the last one
   * assigned wins for all three sections.
   *
   * The materials are what wins, because the rate table is most of a builder's screen - and the
   * heights read as bands rather than as the customer's view out of their door, because a builder
   * is checking a price list and not standing in the garden.
   */
  /* Rock and roots are charged by the hour here exactly as they are on a retaining wall, and
     without these a builder's own screen shows `per_hour`. Kept in this trade's own group rather
     than the shared one: only fencing sells nothing by the hour, and widening the map every trade
     reads is how a vocabulary starts drifting. Tiling and kitchen carry their own `per_hour` for
     the same reason. */
  units: {
    per_hour: 'per hour',
    per_day: 'per day',
  },
  factual: {
    ground_level: 'Ground level',
    low_level: 'Low level',
    elevated: 'Elevated',
    high_level: 'High level',
    timber: 'Timber',
    merbau: 'Merbau',
    composite: 'Composite',
    aluminium: 'Aluminium',
    hardwood: 'Hardwood',
  },
} as const;

export const RENO_LABEL_GROUPS = {
  /* Rooms named the way a customer says them, not the way a builder files them. "The whole house"
     and "Knocking rooms together" are what people actually write; `whole_home` and `open_plan` are
     what the price list calls the same two lines. */
  rooms: {
    kitchen: 'Kitchen',
    bathroom: 'Bathroom',
    ensuite: 'Ensuite',
    laundry: 'Laundry',
    bedroom: 'Bedroom',
    living_room: 'Living room',
    dining_room: 'Dining room',
    hallway: 'Hallway',
    home_office: 'Home office',
    open_plan: 'Knocking rooms together — open plan',
    whole_home: 'The whole house',
  },
  /* What is being done TO the room. Written as the customer's own sentence rather than the trade's
     heading, because "fit out only" means nothing to somebody who has not been quoted before. */
  jobTypes: {
    full_renovation: 'The full renovation',
    demolition_only: 'Just strip it out',
    fit_out_only: 'Fit out what I already have',
    repair: 'A repair, not a renovation',
    /* Named by examples rather than by a category, because "single trade" is builder's language and
       the customer saying "I just want it painted" does not know they are asking for one. */
    single_trade: 'Just one thing — painting, flooring, plastering',
  },
  supply: {
    supply_and_install: 'Supply the materials and do the work',
    labour_only: "I'm supplying the materials",
  },
  /* `any` first, as in all five other trades: somebody renovating a bathroom knows there is one
     there and has not thought about whether the vanity comes out separately from the tiles. */
  removes: {
    any: 'Yes, strip it out',
    small_room: 'A small room',
    bathroom_strip: 'An old bathroom',
    kitchen_strip: 'An old kitchen',
    laundry_strip: 'An old laundry',
    full_interior: 'The whole interior',
  },
  conditions: {
    structural_wall: 'A wall that might be holding something up',
    hidden_damage: 'Water damage or rot I know about',
    asbestos_suspected: 'The house is old enough for asbestos',
    restricted_access: 'Hard to get to',
    services_in_wall: 'Pipes or wiring in the way',
    uneven_floor: 'Uneven floors',
  },
  extras: {
    waterproofing: 'Waterproofing',
    tiling: 'Tiling',
    flooring: 'Flooring',
    plastering: 'Plastering',
    painting: 'Painting',
    cabinetry: 'Cabinetry',
    benchtop: 'A benchtop',
    splashback: 'A splashback',
    doors: 'Doors',
    skirting: 'Skirting boards',
    architraves: 'Architraves',
    ceiling: 'Ceiling work',
    wall_removal: 'Taking a wall out',
    wall_build: 'Building a new wall',
    wardrobe: 'A built-in wardrobe',
    site_protection: 'Protecting the rest of the house',
    waste_disposal: 'Taking the rubbish away',
    material_delivery: 'Material delivery',
    project_management: 'Managing the whole project',
  },
  /* Hourly and daily rates are a real part of this trade's list - carpentry at $95, $110 and $125 -
     and without these a renovator's own screen shows `per_hour`. In this trade's own group rather
     than the shared one, for the reason decking's comment gives. */
  units: {
    per_hour: 'per hour',
    per_day: 'per day',
  },
  /**
   * The same slugs said to the BUILDER, and assigned last in `TRADE_LABELS` so they win there.
   *
   * The repeated-slug trap is mild here but real: `kitchen`, `bathroom` and `laundry` are ROOMS,
   * and `kitchen_strip`/`bathroom_strip`/`laundry_strip` are what comes out of them. The rooms win,
   * because the rate table is most of a builder's screen - and they read as plain nouns rather than
   * as the customer's sentence, because a builder is checking a price list, not choosing a room.
   */
  factual: {
    kitchen: 'Kitchen',
    bathroom: 'Bathroom',
    laundry: 'Laundry',
    open_plan: 'Open plan',
    whole_home: 'Whole home',
    full_renovation: 'Full renovation',
    demolition_only: 'Demolition only',
    fit_out_only: 'Fit-out only',
    repair: 'Repair',
    single_trade: 'Single trade only',
    supply_and_install: 'Supply and install',
    labour_only: 'Installation only',
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
  decking: {
    /* Height first, and it is the only trade here where the first question is not what the thing is
       made of. It decides the shape of the build - posts, bracing, stairs, a balustrade - and a
       customer answers it instantly by looking out of their door, where choosing a timber takes
       them a minute. */
    heights: [...DECK_HEIGHTS],
    /* Treated pine and merbau lead because they are most of this trade, then composite as the
       common third. The four hardwoods do not all fit on one page and the rarer ones follow. */
    materials: [
      'treated_pine',
      'merbau',
      'composite',
      ...DECK_MATERIALS.filter((m) => m !== 'treated_pine' && m !== 'merbau' && m !== 'composite'),
    ],
    attachment: [...DECK_ATTACHMENT],
    balustrades: [...DECK_BALUSTRADES],
    screens: [...DECK_SCREENS],
    stairs: [...DECK_STAIRS],
    removes: ['any', ...DECK_REMOVES.filter((r) => r !== 'any')],
    conditions: [...DECK_CONDITIONS],
    extras: [...DECK_EXTRAS],
  },
  home_renovation: {
    /* The wet rooms lead, and that is where this trade's money is: a bathroom and a kitchen are the
       two dearest lines on the list and between them are most of what anybody renovates. The
       whole-house and open-plan options come LAST rather than first despite being the biggest jobs,
       because a customer who wants one of those will say so in their opening sentence, and putting
       them at the top offers an $8,500 job to somebody asking about a hallway. */
    rooms: [
      'bathroom',
      'kitchen',
      'ensuite',
      'laundry',
      'bedroom',
      'living_room',
      'dining_room',
      'hallway',
      'home_office',
      'open_plan',
      'whole_home',
    ],
    jobTypes: [...RENO_JOB_TYPES],
    supply: [...RENO_SUPPLY],
    removes: ['any', ...RENO_REMOVES.filter((r) => r !== 'any')],
    conditions: [...RENO_CONDITIONS],
    extras: [...RENO_EXTRAS],
  },
};

/** The same, for the words. Keyed by trade so a second trade brings its own and touches nothing. */
export const CUSTOMER_LABELS: Record<Trade, Record<string, Record<string, string>>> = {
  fencing: CUSTOMER_LABEL_GROUPS,
  tiling: TILING_LABEL_GROUPS,
  kitchen: KITCHEN_LABEL_GROUPS,
  retaining_wall: RW_LABEL_GROUPS,
  decking: DECK_LABEL_GROUPS,
  home_renovation: RENO_LABEL_GROUPS,
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
    TILING_LABEL_GROUPS.prep,
    TILING_LABEL_GROUPS.units,
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
    KITCHEN_LABEL_GROUPS.units,
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
  /* The worst case of this trap in the product, and the reason `factual` exists. `timber`, `merbau`,
     `composite` and `aluminium` are each a deck MATERIAL, a BALUSTRADE type and a SCREEN type, and
     `hardwood` is a screen as well as a word for three of the materials. Flattened, whichever group
     is assigned last wins for all three sections - so the customer-facing phrasings go first to be
     overwritten, and the materials win, because the rate table is most of a builder's screen. */
  decking: Object.assign(
    {},
    DECK_LABEL_GROUPS.removes,
    DECK_LABEL_GROUPS.attachment,
    DECK_LABEL_GROUPS.conditions,
    DECK_LABEL_GROUPS.extras,
    DECK_LABEL_GROUPS.screens,
    DECK_LABEL_GROUPS.stairs,
    DECK_LABEL_GROUPS.balustrades,
    DECK_LABEL_GROUPS.heights,
    DECK_LABEL_GROUPS.materials,
    LABEL_GROUPS.units,
    DECK_LABEL_GROUPS.units,
    DECK_LABEL_GROUPS.factual,
  ) as Record<string, string>,
  /* The same trap, mild but real: `kitchen`, `bathroom` and `laundry` are ROOMS a renovator prices,
     and `kitchen_strip`/`bathroom_strip`/`laundry_strip` are what comes out of them. The rooms win,
     because the rate table is most of a builder's screen - so the customer-chat phrasings go first
     to be overwritten and `factual` is assigned last, as it is for decking and retaining wall. */
  home_renovation: Object.assign(
    {},
    RENO_LABEL_GROUPS.removes,
    RENO_LABEL_GROUPS.supply,
    RENO_LABEL_GROUPS.conditions,
    RENO_LABEL_GROUPS.extras,
    RENO_LABEL_GROUPS.jobTypes,
    RENO_LABEL_GROUPS.rooms,
    LABEL_GROUPS.units,
    RENO_LABEL_GROUPS.units,
    RENO_LABEL_GROUPS.factual,
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

export const DECK_QUESTIONS: Record<string, string> = {
  /* Height first, and phrased as what they would DO rather than as a band name. A customer knows
     whether they would step straight out onto it; almost none of them would call that "low level". */
  deckHeight: 'How far off the ground will the deck sit?',
  material: 'What decking are you after?',
  /* "Roughly" for the reason tiling's and kitchen's carry it: the builder measures on site and
     everything is confirmed there, so a customer stalling over an exact figure is stalling over
     something that was never going to be used as given. */
  areaSqm: 'Roughly how big is the deck?',
  attachment: 'Will it be attached to the house, or standing on its own?',
  removal: 'Is there an old deck to take out?',
  needsBalustrade: 'Do you need a balustrade?',
  balustradeLm: 'Roughly how many metres of balustrade?',
  stairs: 'Do you need stairs?',
  stairFlights: 'How many flights of stairs?',
  conditions: 'Anything tricky about the site?',
};

export const RENO_QUESTIONS: Record<string, string> = {
  /* The room is the whole job in this trade, so it is asked first and asked plainly. */
  room: 'Which room are you renovating?',
  /* Not "what job type" - nobody describes their own renovation as a job type. The three real
     answers are the whole thing, just the strip-out, or fitting what they have already bought. */
  jobType: 'What do you need done to it?',
  /* The question this trade turns on, and the one customers do not know is a question: the same
     bathroom is $6,850 of labour or that plus every fitting, and nothing in the number says which.
     "Materials" rather than any one product, because the answer covers tiles, vanity, bath and
     tapware all at once. */
  supply: "Who's buying the materials?",
  removal: 'Is there an old one to strip out?',
  extras: 'Anything else in the job?',
  /* Asked of every caller, because this trade's own rules say a wall must never be assumed
     non-structural and a house of a certain age must never be assumed clear of asbestos. Phrased so
     a customer who does not know can still answer. */
  conditions: 'Anything tricky we should know about?',
};

export const TRADE_QUESTIONS: Record<Trade, Record<string, string>> = {
  fencing: QUESTIONS,
  tiling: TILING_QUESTIONS,
  kitchen: KITCHEN_QUESTIONS,
  retaining_wall: RW_QUESTIONS,
  decking: DECK_QUESTIONS,
  home_renovation: RENO_QUESTIONS,
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
  /* `mentions` is the bare noun for once, and it is safe: `deck` belongs to no other trade in the
     product. The word this trade may NOT claim is `timber` - fencing, retaining wall and decking
     all sell it - which is why the routing regex keeps the hardwoods compound.

     `tradesperson` is "deck builder" rather than "decker" or "carpenter": it is what these
     businesses call themselves, and it is honest about the scope - the electrical for deck lighting
     and any engineering are somebody else's. */
  decking: {
    trade: 'decking',
    noun: 'deck',
    mentions: /deck/i,
    article: 'a deck',
    tradesperson: 'deck builder',
  },
  /* `trade` is two words because there is no single one: "renovating" is a gerund nobody searches
     for and "renovations" plural reads wrong in `askWhichTrade`'s sentence, which puts "services"
     after it. "Home renovation services" is what these businesses advertise.

     `noun` is what gets appended to an image search, and `renovation` is right: "bathroom
     renovation australia" returns finished rooms, where "bathroom australia" returns a map. The
     word this trade may NOT claim in `mentions` is any room - `bathroom` is tiling's, `kitchen` is
     the kitchen trade's - so the pattern stays on the scope word, which is exactly the same
     reasoning `detectTrade`'s precedence rule rests on.

     `tradesperson` is "renovator" rather than "builder": a builder builds a house, and this trade's
     own document is careful that structural work, plumbing, electrical and gas belong to somebody
     licensed for them. */
  home_renovation: {
    trade: 'home renovation',
    noun: 'renovation',
    mentions: /renovat|remodel/i,
    article: 'a renovation',
    tradesperson: 'renovator',
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
  /* The same fixed keys naming the SHAPE of the failure. `material` is the decking board and
     `height` is literally how far off the ground it sits, so this trade fits the fencing-shaped
     names almost exactly. `gate` keeps its meaning of "a part of the brief nobody prices", which
     here is usually the balustrade or the stairs.

     `pricing` matters more on this trade than on any before it: `decking` is already sitting in
     live `services_provided` arrays written long before this backend served the trade, so on day
     one there ARE candidates and none of them has published a rate. This is the sentence they get,
     and it is the correct one. */
  decking: {
    area: 'No deck builder covers that suburb yet. Try a nearby suburb?',
    removal: 'None of the builders near you take out an old deck. Want to arrange that separately?',
    gate: 'Nobody near you prices that part of the job. Want to try without it?',
    height: 'Nobody near you publishes a rate for a deck at that height. Want to try a different one?',
    material: 'The builders near you do not lay that decking yet. Want to try a different board?',
    pricing: 'I found deck builders near you, but none of them have finished setting up their pricing yet.',
  },
  /* The same fixed keys naming the SHAPE of the failure. `material` is the ROOM here - the thing
     nobody near you does - and `height` is the job type, the second half of the rate. That is the
     furthest either name has been stretched in the product, and it is still the right trade-off:
     renaming them is a wire change across six trades to make one table read better.

     `gate` keeps its meaning of "a part of the brief nobody prices", which in this trade is usually
     waterproofing or a benchtop. */
  home_renovation: {
    area: 'No renovator covers that suburb yet. Try a nearby suburb?',
    removal: 'None of the renovators near you strip out an old one. Want to arrange that separately?',
    gate: 'Nobody near you prices that part of the job. Want to try without it?',
    height: 'The renovators near you do that room, but not the way you asked. Want to try something else?',
    material: 'The renovators near you do not do that room yet. Want to try a different one?',
    pricing: 'I found renovators near you, but none of them have finished setting up their pricing yet.',
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
  /**
   * The same rejection, for a business whose prices are all there and none of them quotable.
   *
   * A tiler who charges $95 an hour and a cabinetmaker who sells by the lineal metre have both
   * written a complete, firm, professional price list. Neither can answer "18 square metres of
   * porcelain" or "a large kitchen", because the customer would have to do the sum first - and
   * doing it for them is the one thing the model may never do (`CLAUDE.md` #4). So they are turned
   * away, and "a few things need updating" reads to them as though we skimmed it: nothing is
   * missing, and they know it.
   *
   * It does not name the unit, and must not. Which measurement is wrong is the TRADE's business and
   * differs every time - hours here, lineal metres there - and the model's own fixes name it
   * precisely ("Replace hourly tiling rates with set per-square-metre prices"). This opening says
   * only what is true of all of them, because the review prompt is explicit that the fixed text
   * around the fixes must not repeat what the fixes say.
   */
  rejectedNotQuotable: {
    opening:
      'We have been through the details you sent. The prices are all there - they are just not in a form we can quote a customer from yet.',
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
  /* Taken from the blocking rules D1-D9 in prompts/sop/decking/rules.md, in the same order, for the
     reason all four trades before it do: a business reading this form and a reviewer judging what
     they send have to be working from one list, or they get rejected for sending exactly what they
     were asked for.

     The second and fourth lines carry the weight. A deck rate that does not say what HEIGHT it is
     for is a rate for an unknown build - the posts, bracing and footings under an elevated deck are
     most of what separates it from one sitting on the ground. And a balustrade priced per square
     metre is a balustrade priced against the wrong thing: it runs along the deck's edge, so it is
     measured in linear metres, and a list that gets that wrong quotes a railing by the floor area
     behind it. */
  decking: {
    need: [
      'Your rate per square metre for every decking board you lay — treated pine, merbau, spotted gum, blackbutt, composite',
      'What height each of those rates is for — ground level, low, elevated, high — or a line saying one rate covers every height you build',
      'What you charge for stairs, per flight or per step, and whether that includes the handrail',
      'Balustrade priced per LINEAR metre by type — timber, aluminium, steel, glass, wire',
      'Privacy screens priced per square metre or as a package, by material',
      'What you charge to take out and dispose of an existing deck',
      'Where you stand on engineering and building permits — who arranges them, who pays, and what you charge if you do',
      'Your minimum charge, any design fee, any site inspection fee, and any travel charge',
      'The suburb or postcode you work out from, how far you travel, and whether your prices include GST',
    ],
    helpful: [
      'What a standard deck includes — footings, posts, bearers, joists, bracing, boards, fixings, clean-up',
      'What it does not — engineering, permits, rock excavation, tree or stump removal, electrical, landscaping, turf',
      'Your prices for skirting, built-in seating, planter boxes, access hatches and a pergola over the deck',
      'Oiling, sanding and restoration prices, so a customer with a tired deck can be quoted too',
      'Your hourly rate for variations, and your workmanship warranty in your own words',
    ],
    example: [
      'DECKING — SUPPLIED AND INSTALLED, PER SQUARE METRE',
      'Ground level: treated pine $280. Merbau $420. Spotted gum $445. Blackbutt $465. Composite $520.',
      'Low level: treated pine $310. Merbau $455. Spotted gum $480. Composite $560.',
      'Elevated: treated pine $390. Merbau $540. Spotted gum $570. Composite $650.',
      'High level: treated pine $470. Merbau $640. Composite $760.',
      '',
      'STAIRS',
      'Standard timber flight up to 5 steps $950. Each additional step $140.',
      'Hardwood flight up to 5 steps $1,350. Each additional step $190.',
      '',
      'BALUSTRADE — PER LINEAR METRE',
      'Timber $220. Aluminium $290. Steel $340. Wire $380. Glass $520.',
      '',
      'PRIVACY SCREENS',
      'Timber batten $340 per square metre. Merbau $420. Aluminium $460. Composite $480.',
      '',
      'DEMOLITION AND DISPOSAL',
      'Existing timber deck removal $85 per square metre. Composite $95 per square metre.',
      'Disposal $550.',
      '',
      'ENGINEERING AND PERMITS',
      'Whether a deck needs a building permit depends on its height, its position and the site, and',
      'we check it for every job rather than assuming. We arrange engineering from $890 and the',
      'building permit application from $650; council and surveyor fees are the customer’s.',
      'Excluded unless the written quotation includes them.',
      '',
      'THE REST OF WHAT WE DO',
      'Skirting $180 per metre. Built-in seating $420 per metre. Planter box $560 each.',
      'Access hatch $320. Pergola over the deck $640 per square metre. Lighting coordination $280.',
      'Deck oiling $38 per square metre. Sanding $45 per square metre. Full restoration $95 per square metre.',
      'Board replacement $85 each. Design $450.',
      '',
      'THE REST',
      'All prices include GST. Based in Berwick, we travel 20km.',
      'Minimum charge $1,200. Site inspection and measure $150. Travel outside our area $90.',
      'Ten year workmanship warranty. Manufacturer warranties are the maker’s, not ours.',
      'Not included: engineering, permits, rock excavation, tree and stump removal, electrical,',
      'plumbing, drainage changes, retaining walls, landscaping, turf and painting.',
    ].join('\n'),
  },

  /* Taken from the blocking rules H1-H8 in prompts/sop/home_renovation/rules.md, in the same order,
     so a business reading this and a reviewer judging it are working from one list.

     The first line does more work here than in any other trade. A renovator's price list is mostly
     numbers with no unit on them - "Bathroom renovation labour $6,850" - and a business that has
     been told elsewhere that a price needs a unit will start writing "per bathroom" and "per job"
     on every line, or worse, decide their own list is wrong. Saying plainly that a flat price per
     room IS the unit here is what stops that. */
  home_renovation: {
    need: [
      'Each room you renovate, and your price for it - a flat price for the room is exactly right, no unit needed',
      'Your strip-out and demolition prices, by room (or say you do not do demolition)',
      'Whether the price is your labour only or includes the materials - and your material prices if you supply them',
      'What waste disposal costs (or say it is included)',
      'What your prices do NOT cover - permits, engineering, electrical, plumbing, gas, asbestos',
      'Your position on structural work: who assesses a wall before it comes out, and who pays for engineering',
      'Your minimum attendance, site inspection fee, design consultation fee, and any travel charge',
      'The suburb or postcode you work out from, and how far you travel',
      'Whether your prices include GST',
    ],
    helpful: [
      'Your per-square-metre rates - plastering, flooring, tiling, painting - for customers wanting one thing done',
      'Your per-item prices: doors, cabinets, benchtop cut-outs',
      'Your hourly rates for carpentry and variations, and your variation administration fee',
      'What a standard renovation includes - protection, demolition, preparation, installation, finishing, clean-up',
      'Your project management fee for larger jobs, and how you handle hidden damage found mid-job',
      'How long your workmanship is warranted for, in your own words',
    ],
    example: [
      'ROOM RENOVATIONS — OUR LABOUR, MATERIALS QUOTED SEPARATELY',
      'Bathroom $6,850. Ensuite $5,950. Kitchen $4,850. Laundry $3,850.',
      'Bedroom $2,850. Living room $3,250. Dining room $2,450. Hallway $1,850. Home office $2,750.',
      'Open-plan renovation $8,500. Whole-home projects are quoted room by room from the above.',
      '',
      'STRIP-OUT AND DEMOLITION',
      'Bathroom $1,450. Kitchen $1,650. Laundry $750. Small room $750. Full interior $4,250.',
      '',
      'SUPPLY AND INSTALL',
      'We can supply the materials or install what you have already bought.',
      'Kitchen cabinetry package $8,950. Material procurement $180. Standard delivery $250.',
      '',
      'THE REST OF WHAT WE DO',
      'Waterproofing $950. Bathroom tiling $2,450. Vanity $450. Toilet $350. Bath $650.',
      'Cabinet installation $2,850. Benchtop installation $850. Splashback preparation $480.',
      'Final finishing $650. Built-in wardrobe $1,850. Site protection $350.',
      'Non-structural wall removal $850. Structural wall removal $2,850. Stud wall $1,250.',
      'Waste disposal $550. Bathroom waste $650. Kitchen waste $650.',
      '',
      'BY THE SQUARE METRE',
      'Wall plastering $65. Ceiling plastering $75. Floor tiling $75. Wall tiling $78.',
      'Laminate flooring $55. Hybrid $60. Engineered timber $75. Timber $95.',
      '',
      'EACH, AND BY THE HOUR',
      'Internal door $280. Base cabinet $180. Wall cabinet $165. Sink cut-out $180.',
      'General carpentry $95 per hour. Finish carpentry $110 per hour. Variations $110 per hour.',
      '',
      'STRUCTURAL WORK AND APPROVALS',
      'We never assume a wall is non-structural. Every wall is assessed before it comes out, and',
      'engineering, temporary support and structural steel are quoted separately where needed.',
      'Whether a renovation needs a permit depends on the work and the property, and we check it',
      'rather than assuming either way.',
      '',
      'THE REST',
      'All prices include GST. Based in Berwick, we travel 30km.',
      'Minimum attendance $450. Site inspection $150. Design consultation $180. Travel outside $95.',
      'Project management on larger renovations $3,500.',
      'Not included: building permits, engineering, council fees, electrical, plumbing, gas,',
      'asbestos removal, appliance supply, specialist stone fabrication and major landscaping.',
    ].join('\n'),
  },
};
