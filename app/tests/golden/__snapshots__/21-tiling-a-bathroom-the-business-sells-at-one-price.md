# 21 tiling, a bathroom the business sells at one price

Guards: a per_job rate is NOT multiplied by the area - the error that would quote a bathroom at forty thousand dollars - while removal and waterproofing still add on top

## turn 1

customer: "I need a tiling quote"

```json
{
  "sessionId": "golden",
  "trade": "tiling",
  "intent": "new_quote",
  "place": null,
  "type": "message",
  "message": "Happy to help with that. Mind if I ask a few quick questions?",
  "options": [],
  "checklistComplete": false,
  "checklist": {
    "suburb": null,
    "jobType": null,
    "tileType": null,
    "areaSqm": null,
    "supply": null,
    "removal": null,
    "waterproofing": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 1,
      "cursor": {},
      "lastAsked": null,
      "lastQuestion": "Happy to help with that. Mind if I ask a few quick questions?",
      "lastValues": [],
      "lastType": "message",
      "fixing": false,
      "rejectedPlaces": [],
      "nearbyPlaces": {},
      "suburbHint": null,
      "place": null,
      "answers": 0
    }
  },
  "checklistDisplay": {},
  "checklistAnswered": [],
  "checklistPending": [
    {
      "key": "suburb",
      "title": "Suburb"
    },
    {
      "key": "jobType",
      "title": "Job"
    },
    {
      "key": "tileType",
      "title": "Tile"
    },
    {
      "key": "areaSqm",
      "title": "Area"
    },
    {
      "key": "supply",
      "title": "Tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles"
    },
    {
      "key": "waterproofing",
      "title": "Waterproofing"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    }
  ],
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 2

customer: "yes go ahead"

```json
{
  "sessionId": "golden",
  "trade": "tiling",
  "intent": "new_quote",
  "place": null,
  "type": "message",
  "message": "Which suburb is the job in? A postcode works too.",
  "options": [],
  "expects": "suburb",
  "checklistComplete": false,
  "checklist": {
    "suburb": null,
    "jobType": null,
    "tileType": null,
    "areaSqm": null,
    "supply": null,
    "removal": null,
    "waterproofing": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 2,
      "cursor": {},
      "lastAsked": "suburb",
      "lastQuestion": "Which suburb is the job in? A postcode works too.",
      "lastValues": [],
      "lastType": "message",
      "fixing": false,
      "rejectedPlaces": [],
      "nearbyPlaces": {},
      "suburbHint": null,
      "place": null,
      "answers": 0
    }
  },
  "checklistDisplay": {},
  "checklistAnswered": [],
  "checklistPending": [
    {
      "key": "suburb",
      "title": "Suburb"
    },
    {
      "key": "jobType",
      "title": "Job"
    },
    {
      "key": "tileType",
      "title": "Tile"
    },
    {
      "key": "areaSqm",
      "title": "Area"
    },
    {
      "key": "supply",
      "title": "Tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles"
    },
    {
      "key": "waterproofing",
      "title": "Waterproofing"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    }
  ],
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 3

customer: "Berwick"
picked place: Berwick, VIC 3806

```json
{
  "sessionId": "golden",
  "trade": "tiling",
  "intent": "new_quote",
  "place": {
    "latitude": -38.0362,
    "longitude": 145.3478,
    "suburb": "Berwick",
    "state": "VIC",
    "postcode": "3806",
    "displayLabel": "Berwick, VIC 3806"
  },
  "type": "question",
  "message": "What are you having tiled?",
  "options": [
    {
      "label": "Bathroom",
      "value": "bathroom"
    },
    {
      "label": "Floor only",
      "value": "floor_only"
    },
    {
      "label": "Kitchen splashback",
      "value": "kitchen_splashback"
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": null,
    "tileType": null,
    "areaSqm": null,
    "supply": null,
    "removal": null,
    "waterproofing": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 3,
      "cursor": {
        "jobType": 0
      },
      "lastAsked": "jobType",
      "lastQuestion": "What are you having tiled?",
      "lastValues": [
        "bathroom",
        "floor_only",
        "kitchen_splashback",
        "__other__"
      ],
      "lastType": "question",
      "fixing": false,
      "rejectedPlaces": [],
      "nearbyPlaces": {},
      "suburbHint": null,
      "place": {
        "latitude": -38.0362,
        "longitude": 145.3478,
        "suburb": "Berwick",
        "state": "VIC",
        "postcode": "3806",
        "displayLabel": "Berwick, VIC 3806"
      },
      "answers": 0
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    }
  ],
  "checklistPending": [
    {
      "key": "jobType",
      "title": "Job"
    },
    {
      "key": "tileType",
      "title": "Tile"
    },
    {
      "key": "areaSqm",
      "title": "Area"
    },
    {
      "key": "supply",
      "title": "Tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles"
    },
    {
      "key": "waterproofing",
      "title": "Waterproofing"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    }
  ],
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 4

customer: "bathroom"

```json
{
  "sessionId": "golden",
  "trade": "tiling",
  "intent": "new_quote",
  "place": {
    "latitude": -38.0362,
    "longitude": 145.3478,
    "suburb": "Berwick",
    "state": "VIC",
    "postcode": "3806",
    "displayLabel": "Berwick, VIC 3806"
  },
  "type": "question",
  "message": "What tile are you using?",
  "options": [
    {
      "label": "Ceramic",
      "value": "ceramic"
    },
    {
      "label": "Porcelain",
      "value": "porcelain"
    },
    {
      "label": "Large format 600×1200",
      "value": "large_format_600x1200"
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "bathroom",
    "tileType": null,
    "areaSqm": null,
    "supply": null,
    "removal": null,
    "waterproofing": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 4,
      "cursor": {
        "jobType": 0,
        "tileType": 0
      },
      "lastAsked": "tileType",
      "lastQuestion": "What tile are you using?",
      "lastValues": [
        "ceramic",
        "porcelain",
        "large_format_600x1200",
        "__other__"
      ],
      "lastType": "question",
      "fixing": false,
      "rejectedPlaces": [],
      "nearbyPlaces": {},
      "suburbHint": null,
      "place": {
        "latitude": -38.0362,
        "longitude": 145.3478,
        "suburb": "Berwick",
        "state": "VIC",
        "postcode": "3806",
        "displayLabel": "Berwick, VIC 3806"
      },
      "answers": 0
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Bathroom"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Bathroom"
    }
  ],
  "checklistPending": [
    {
      "key": "tileType",
      "title": "Tile"
    },
    {
      "key": "areaSqm",
      "title": "Area"
    },
    {
      "key": "supply",
      "title": "Tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles"
    },
    {
      "key": "waterproofing",
      "title": "Waterproofing"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    }
  ],
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 5

customer: "porcelain"

```json
{
  "sessionId": "golden",
  "trade": "tiling",
  "intent": "new_quote",
  "place": {
    "latitude": -38.0362,
    "longitude": 145.3478,
    "suburb": "Berwick",
    "state": "VIC",
    "postcode": "3806",
    "displayLabel": "Berwick, VIC 3806"
  },
  "type": "question",
  "message": "Roughly how many square metres?",
  "options": [
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "bathroom",
    "tileType": "porcelain",
    "areaSqm": null,
    "supply": null,
    "removal": null,
    "waterproofing": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 5,
      "cursor": {
        "jobType": 0,
        "tileType": 0,
        "areaSqm": 0
      },
      "lastAsked": "areaSqm",
      "lastQuestion": "Roughly how many square metres?",
      "lastValues": [
        "__other__"
      ],
      "lastType": "question",
      "fixing": false,
      "rejectedPlaces": [],
      "nearbyPlaces": {},
      "suburbHint": null,
      "place": {
        "latitude": -38.0362,
        "longitude": 145.3478,
        "suburb": "Berwick",
        "state": "VIC",
        "postcode": "3806",
        "displayLabel": "Berwick, VIC 3806"
      },
      "answers": 0
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Bathroom"
    },
    "tileType": {
      "title": "Tile",
      "value": "Porcelain"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Bathroom"
    },
    {
      "key": "tileType",
      "title": "Tile",
      "value": "Porcelain"
    }
  ],
  "checklistPending": [
    {
      "key": "areaSqm",
      "title": "Area"
    },
    {
      "key": "supply",
      "title": "Tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles"
    },
    {
      "key": "waterproofing",
      "title": "Waterproofing"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    }
  ],
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 6

customer: "8"

```json
{
  "sessionId": "golden",
  "trade": "tiling",
  "intent": "new_quote",
  "place": {
    "latitude": -38.0362,
    "longitude": 145.3478,
    "suburb": "Berwick",
    "state": "VIC",
    "postcode": "3806",
    "displayLabel": "Berwick, VIC 3806"
  },
  "type": "question",
  "message": "Who's buying the tiles?",
  "options": [
    {
      "label": "They supply the tiles",
      "value": "supply_and_install"
    },
    {
      "label": "I'm buying the tiles",
      "value": "labour_only"
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "bathroom",
    "tileType": "porcelain",
    "areaSqm": 8,
    "supply": null,
    "removal": null,
    "waterproofing": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 6,
      "cursor": {
        "jobType": 0,
        "tileType": 0,
        "areaSqm": 0,
        "supply": 0
      },
      "lastAsked": "supply",
      "lastQuestion": "Who's buying the tiles?",
      "lastValues": [
        "supply_and_install",
        "labour_only",
        "__other__"
      ],
      "lastType": "question",
      "fixing": false,
      "rejectedPlaces": [],
      "nearbyPlaces": {},
      "suburbHint": null,
      "place": {
        "latitude": -38.0362,
        "longitude": 145.3478,
        "suburb": "Berwick",
        "state": "VIC",
        "postcode": "3806",
        "displayLabel": "Berwick, VIC 3806"
      },
      "answers": 0
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Bathroom"
    },
    "tileType": {
      "title": "Tile",
      "value": "Porcelain"
    },
    "areaSqm": {
      "title": "Area",
      "value": "8m²"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Bathroom"
    },
    {
      "key": "tileType",
      "title": "Tile",
      "value": "Porcelain"
    },
    {
      "key": "areaSqm",
      "title": "Area",
      "value": "8m²"
    }
  ],
  "checklistPending": [
    {
      "key": "supply",
      "title": "Tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles"
    },
    {
      "key": "waterproofing",
      "title": "Waterproofing"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    }
  ],
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 7

customer: "labour_only"

```json
{
  "sessionId": "golden",
  "trade": "tiling",
  "intent": "new_quote",
  "place": {
    "latitude": -38.0362,
    "longitude": 145.3478,
    "suburb": "Berwick",
    "state": "VIC",
    "postcode": "3806",
    "displayLabel": "Berwick, VIC 3806"
  },
  "type": "question",
  "message": "Are there old tiles to take up?",
  "options": [
    {
      "label": "Yes, take them up",
      "value": "any"
    },
    {
      "label": "Nothing to take up",
      "value": "none"
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "bathroom",
    "tileType": "porcelain",
    "areaSqm": 8,
    "supply": "labour_only",
    "removal": null,
    "waterproofing": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 7,
      "cursor": {
        "jobType": 0,
        "tileType": 0,
        "areaSqm": 0,
        "supply": 0,
        "removal": 0
      },
      "lastAsked": "removal",
      "lastQuestion": "Are there old tiles to take up?",
      "lastValues": [
        "any",
        "none",
        "__other__"
      ],
      "lastType": "question",
      "fixing": false,
      "rejectedPlaces": [],
      "nearbyPlaces": {},
      "suburbHint": null,
      "place": {
        "latitude": -38.0362,
        "longitude": 145.3478,
        "suburb": "Berwick",
        "state": "VIC",
        "postcode": "3806",
        "displayLabel": "Berwick, VIC 3806"
      },
      "answers": 0
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Bathroom"
    },
    "tileType": {
      "title": "Tile",
      "value": "Porcelain"
    },
    "areaSqm": {
      "title": "Area",
      "value": "8m²"
    },
    "supply": {
      "title": "Tiles",
      "value": "I'm buying the tiles"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Bathroom"
    },
    {
      "key": "tileType",
      "title": "Tile",
      "value": "Porcelain"
    },
    {
      "key": "areaSqm",
      "title": "Area",
      "value": "8m²"
    },
    {
      "key": "supply",
      "title": "Tiles",
      "value": "I'm buying the tiles"
    }
  ],
  "checklistPending": [
    {
      "key": "removal",
      "title": "Old tiles"
    },
    {
      "key": "waterproofing",
      "title": "Waterproofing"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    }
  ],
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 8

customer: "any"

```json
{
  "sessionId": "golden",
  "trade": "tiling",
  "intent": "new_quote",
  "place": {
    "latitude": -38.0362,
    "longitude": 145.3478,
    "suburb": "Berwick",
    "state": "VIC",
    "postcode": "3806",
    "displayLabel": "Berwick, VIC 3806"
  },
  "type": "question",
  "message": "Does any of it need waterproofing?",
  "options": [
    {
      "label": "Yes, the bathroom",
      "value": "bathroom"
    },
    {
      "label": "Yes, the ensuite",
      "value": "ensuite"
    },
    {
      "label": "Not needed",
      "value": "none"
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "bathroom",
    "tileType": "porcelain",
    "areaSqm": 8,
    "supply": "labour_only",
    "removal": "any",
    "waterproofing": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 8,
      "cursor": {
        "jobType": 0,
        "tileType": 0,
        "areaSqm": 0,
        "supply": 0,
        "removal": 0,
        "waterproofing": 0
      },
      "lastAsked": "waterproofing",
      "lastQuestion": "Does any of it need waterproofing?",
      "lastValues": [
        "bathroom",
        "ensuite",
        "none",
        "__other__"
      ],
      "lastType": "question",
      "fixing": false,
      "rejectedPlaces": [],
      "nearbyPlaces": {},
      "suburbHint": null,
      "place": {
        "latitude": -38.0362,
        "longitude": 145.3478,
        "suburb": "Berwick",
        "state": "VIC",
        "postcode": "3806",
        "displayLabel": "Berwick, VIC 3806"
      },
      "answers": 0
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Bathroom"
    },
    "tileType": {
      "title": "Tile",
      "value": "Porcelain"
    },
    "areaSqm": {
      "title": "Area",
      "value": "8m²"
    },
    "supply": {
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    "removal": {
      "title": "Old tiles",
      "value": "Yes, take them up"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Bathroom"
    },
    {
      "key": "tileType",
      "title": "Tile",
      "value": "Porcelain"
    },
    {
      "key": "areaSqm",
      "title": "Area",
      "value": "8m²"
    },
    {
      "key": "supply",
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles",
      "value": "Yes, take them up"
    }
  ],
  "checklistPending": [
    {
      "key": "waterproofing",
      "title": "Waterproofing"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    }
  ],
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 9

customer: "bathroom"

```json
{
  "sessionId": "golden",
  "trade": "tiling",
  "intent": "new_quote",
  "place": {
    "latitude": -38.0362,
    "longitude": 145.3478,
    "suburb": "Berwick",
    "state": "VIC",
    "postcode": "3806",
    "displayLabel": "Berwick, VIC 3806"
  },
  "type": "question",
  "message": "Anything tricky about the site?",
  "options": [
    {
      "label": "Hard to get to",
      "value": "restricted_access"
    },
    {
      "label": "Upstairs",
      "value": "second_storey"
    },
    {
      "label": "Nothing tricky",
      "value": "none"
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "bathroom",
    "tileType": "porcelain",
    "areaSqm": 8,
    "supply": "labour_only",
    "removal": "any",
    "waterproofing": "bathroom",
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 9,
      "cursor": {
        "jobType": 0,
        "tileType": 0,
        "areaSqm": 0,
        "supply": 0,
        "removal": 0,
        "waterproofing": 0,
        "conditions": 0
      },
      "lastAsked": "conditions",
      "lastQuestion": "Anything tricky about the site?",
      "lastValues": [
        "restricted_access",
        "second_storey",
        "none",
        "__other__"
      ],
      "lastType": "question",
      "fixing": false,
      "rejectedPlaces": [],
      "nearbyPlaces": {},
      "suburbHint": null,
      "place": {
        "latitude": -38.0362,
        "longitude": 145.3478,
        "suburb": "Berwick",
        "state": "VIC",
        "postcode": "3806",
        "displayLabel": "Berwick, VIC 3806"
      },
      "answers": 0
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Bathroom"
    },
    "tileType": {
      "title": "Tile",
      "value": "Porcelain"
    },
    "areaSqm": {
      "title": "Area",
      "value": "8m²"
    },
    "supply": {
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    "removal": {
      "title": "Old tiles",
      "value": "Yes, take them up"
    },
    "waterproofing": {
      "title": "Waterproofing",
      "value": "Yes, the bathroom"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Bathroom"
    },
    {
      "key": "tileType",
      "title": "Tile",
      "value": "Porcelain"
    },
    {
      "key": "areaSqm",
      "title": "Area",
      "value": "8m²"
    },
    {
      "key": "supply",
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles",
      "value": "Yes, take them up"
    },
    {
      "key": "waterproofing",
      "title": "Waterproofing",
      "value": "Yes, the bathroom"
    }
  ],
  "checklistPending": [
    {
      "key": "conditions",
      "title": "Site conditions"
    }
  ],
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 10

customer: "none"

```json
{
  "sessionId": "golden",
  "trade": "tiling",
  "intent": "new_quote",
  "place": {
    "latitude": -38.0362,
    "longitude": 145.3478,
    "suburb": "Berwick",
    "state": "VIC",
    "postcode": "3806",
    "displayLabel": "Berwick, VIC 3806"
  },
  "type": "confirmation",
  "message": "Got it — Berwick, VIC 3806, Undefined, removing the old yes, take them up. All correct?",
  "options": [
    {
      "label": "Yes, that's all correct",
      "value": "yes"
    },
    {
      "label": "No, something's wrong",
      "value": "no"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "bathroom",
    "tileType": "porcelain",
    "areaSqm": 8,
    "supply": "labour_only",
    "removal": "any",
    "waterproofing": "bathroom",
    "conditions": [],
    "existingPrice": null,
    "_ui": {
      "turn": 10,
      "cursor": {
        "jobType": 0,
        "tileType": 0,
        "areaSqm": 0,
        "supply": 0,
        "removal": 0,
        "waterproofing": 0,
        "conditions": 0
      },
      "lastAsked": null,
      "lastQuestion": "Got it — Berwick, VIC 3806, Undefined, removing the old yes, take them up. All correct?",
      "lastValues": [
        "yes",
        "no"
      ],
      "lastType": "confirmation",
      "fixing": false,
      "rejectedPlaces": [],
      "nearbyPlaces": {},
      "suburbHint": null,
      "place": {
        "latitude": -38.0362,
        "longitude": 145.3478,
        "suburb": "Berwick",
        "state": "VIC",
        "postcode": "3806",
        "displayLabel": "Berwick, VIC 3806"
      },
      "answers": 0
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Bathroom"
    },
    "tileType": {
      "title": "Tile",
      "value": "Porcelain"
    },
    "areaSqm": {
      "title": "Area",
      "value": "8m²"
    },
    "supply": {
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    "removal": {
      "title": "Old tiles",
      "value": "Yes, take them up"
    },
    "waterproofing": {
      "title": "Waterproofing",
      "value": "Yes, the bathroom"
    },
    "conditions": {
      "title": "Site conditions",
      "value": "Nothing tricky"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Bathroom"
    },
    {
      "key": "tileType",
      "title": "Tile",
      "value": "Porcelain"
    },
    {
      "key": "areaSqm",
      "title": "Area",
      "value": "8m²"
    },
    {
      "key": "supply",
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles",
      "value": "Yes, take them up"
    },
    {
      "key": "waterproofing",
      "title": "Waterproofing",
      "value": "Yes, the bathroom"
    },
    {
      "key": "conditions",
      "title": "Site conditions",
      "value": "Nothing tricky"
    }
  ],
  "checklistPending": [],
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 11

customer: "yes"

```json
{
  "sessionId": "golden",
  "trade": "tiling",
  "intent": "new_quote",
  "place": {
    "latitude": -38.0362,
    "longitude": 145.3478,
    "suburb": "Berwick",
    "state": "VIC",
    "postcode": "3806",
    "displayLabel": "Berwick, VIC 3806"
  },
  "type": "result",
  "message": "Here are the local businesses that cover your job.",
  "options": [],
  "results": [
    {
      "businessId": "tile-1",
      "autoAcceptsAi": true,
      "businessName": "Paky Tiles",
      "suburb": "Berwick, VIC 3806",
      "ratePerMeter": 770,
      "estimatedTotal": 6160,
      "notes": "incl. GST · 12.6 km away · 4.9★ (80) · Fixed price for the job · Old tiles removed · You supply the tiles · Waterproofing included"
    }
  ],
  "avgRatePerMeter": 770,
  "comparison": {
    "potentialSavings": null,
    "marketAverage": 6160,
    "totalQuotesScreened": 1,
    "userExistingPrice": null,
    "quotes": [
      {
        "businessId": "tile-1",
        "autoAcceptsAi": true,
        "businessName": "Paky Tiles",
        "ratePerMeter": 770,
        "projectTotalMin": 6160,
        "projectTotalMax": 6160,
        "badges": [
          "incl. GST",
          "12.6 km away",
          "4.9★ (80)",
          "Fixed price for the job",
          "Old tiles removed",
          "You supply the tiles",
          "Waterproofing included"
        ],
        "warranty": "Workmanship warranty as per contract",
        "tag": "BEST_VALUE",
        "savingsFromAverage": null,
        "suburb": "Berwick, VIC 3806"
      }
    ]
  },
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "bathroom",
    "tileType": "porcelain",
    "areaSqm": 8,
    "supply": "labour_only",
    "removal": "any",
    "waterproofing": "bathroom",
    "conditions": [],
    "existingPrice": null,
    "_ui": {
      "turn": 11,
      "cursor": {
        "jobType": 0,
        "tileType": 0,
        "areaSqm": 0,
        "supply": 0,
        "removal": 0,
        "waterproofing": 0,
        "conditions": 0
      },
      "lastAsked": null,
      "lastQuestion": "Let me check what businesses are available near you…",
      "lastValues": [],
      "lastType": "message",
      "fixing": false,
      "rejectedPlaces": [],
      "nearbyPlaces": {},
      "suburbHint": null,
      "place": {
        "latitude": -38.0362,
        "longitude": 145.3478,
        "suburb": "Berwick",
        "state": "VIC",
        "postcode": "3806",
        "displayLabel": "Berwick, VIC 3806"
      },
      "answers": 0
    }
  },
  "checklistComplete": true,
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Bathroom"
    },
    "tileType": {
      "title": "Tile",
      "value": "Porcelain"
    },
    "areaSqm": {
      "title": "Area",
      "value": "8m²"
    },
    "supply": {
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    "removal": {
      "title": "Old tiles",
      "value": "Yes, take them up"
    },
    "waterproofing": {
      "title": "Waterproofing",
      "value": "Yes, the bathroom"
    },
    "conditions": {
      "title": "Site conditions",
      "value": "Nothing tricky"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Bathroom"
    },
    {
      "key": "tileType",
      "title": "Tile",
      "value": "Porcelain"
    },
    {
      "key": "areaSqm",
      "title": "Area",
      "value": "8m²"
    },
    {
      "key": "supply",
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles",
      "value": "Yes, take them up"
    },
    {
      "key": "waterproofing",
      "title": "Waterproofing",
      "value": "Yes, the bathroom"
    },
    {
      "key": "conditions",
      "title": "Site conditions",
      "value": "Nothing tricky"
    }
  ],
  "checklistPending": []
}
```
