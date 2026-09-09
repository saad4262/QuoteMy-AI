# 24 tiling, nobody prices that job

Guards: the no-match sentence is tiling own - never "the businesses near you do not offer that fence type"

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
      "answers": 0,
      "history": [
        {
          "you": "I need a tiling quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        }
      ],
      "trade": "tiling"
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
      "answers": 0,
      "history": [
        {
          "you": "I need a tiling quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        }
      ],
      "trade": "tiling"
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
      "answers": 0,
      "history": [
        {
          "you": "I need a tiling quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having tiled?"
        }
      ],
      "trade": "tiling"
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

customer: "kitchen_splashback"

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
    "jobType": "kitchen_splashback",
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
      "answers": 0,
      "history": [
        {
          "you": "I need a tiling quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having tiled?"
        }
      ],
      "trade": "tiling"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Kitchen splashback"
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
      "value": "Kitchen splashback"
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
    "jobType": "kitchen_splashback",
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
      "answers": 0,
      "history": [
        {
          "you": "I need a tiling quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having tiled?"
        }
      ],
      "trade": "tiling"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Kitchen splashback"
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
      "value": "Kitchen splashback"
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

customer: "3"

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
    "jobType": "kitchen_splashback",
    "tileType": "porcelain",
    "areaSqm": 3,
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
      "answers": 0,
      "history": [
        {
          "you": "I need a tiling quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having tiled?"
        },
        {
          "you": "3",
          "me": "Who's buying the tiles?"
        }
      ],
      "trade": "tiling"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Kitchen splashback"
    },
    "tileType": {
      "title": "Tile",
      "value": "Porcelain"
    },
    "areaSqm": {
      "title": "Area",
      "value": "3m²"
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
      "value": "Kitchen splashback"
    },
    {
      "key": "tileType",
      "title": "Tile",
      "value": "Porcelain"
    },
    {
      "key": "areaSqm",
      "title": "Area",
      "value": "3m²"
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
    "jobType": "kitchen_splashback",
    "tileType": "porcelain",
    "areaSqm": 3,
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
      "answers": 0,
      "history": [
        {
          "you": "I need a tiling quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having tiled?"
        },
        {
          "you": "3",
          "me": "Who's buying the tiles?"
        }
      ],
      "trade": "tiling"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Kitchen splashback"
    },
    "tileType": {
      "title": "Tile",
      "value": "Porcelain"
    },
    "areaSqm": {
      "title": "Area",
      "value": "3m²"
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
      "value": "Kitchen splashback"
    },
    {
      "key": "tileType",
      "title": "Tile",
      "value": "Porcelain"
    },
    {
      "key": "areaSqm",
      "title": "Area",
      "value": "3m²"
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
    "jobType": "kitchen_splashback",
    "tileType": "porcelain",
    "areaSqm": 3,
    "supply": "labour_only",
    "removal": "none",
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
      "answers": 0,
      "history": [
        {
          "you": "I need a tiling quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having tiled?"
        },
        {
          "you": "3",
          "me": "Who's buying the tiles?"
        }
      ],
      "trade": "tiling"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Kitchen splashback"
    },
    "tileType": {
      "title": "Tile",
      "value": "Porcelain"
    },
    "areaSqm": {
      "title": "Area",
      "value": "3m²"
    },
    "supply": {
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    "removal": {
      "title": "Old tiles",
      "value": "Nothing to remove"
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
      "value": "Kitchen splashback"
    },
    {
      "key": "tileType",
      "title": "Tile",
      "value": "Porcelain"
    },
    {
      "key": "areaSqm",
      "title": "Area",
      "value": "3m²"
    },
    {
      "key": "supply",
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles",
      "value": "Nothing to remove"
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
    "jobType": "kitchen_splashback",
    "tileType": "porcelain",
    "areaSqm": 3,
    "supply": "labour_only",
    "removal": "none",
    "waterproofing": "none",
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
      "answers": 0,
      "history": [
        {
          "you": "I need a tiling quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having tiled?"
        },
        {
          "you": "3",
          "me": "Who's buying the tiles?"
        }
      ],
      "trade": "tiling"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Kitchen splashback"
    },
    "tileType": {
      "title": "Tile",
      "value": "Porcelain"
    },
    "areaSqm": {
      "title": "Area",
      "value": "3m²"
    },
    "supply": {
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    "removal": {
      "title": "Old tiles",
      "value": "Nothing to remove"
    },
    "waterproofing": {
      "title": "Waterproofing",
      "value": "None"
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
      "value": "Kitchen splashback"
    },
    {
      "key": "tileType",
      "title": "Tile",
      "value": "Porcelain"
    },
    {
      "key": "areaSqm",
      "title": "Area",
      "value": "3m²"
    },
    {
      "key": "supply",
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles",
      "value": "Nothing to remove"
    },
    {
      "key": "waterproofing",
      "title": "Waterproofing",
      "value": "None"
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
  "message": "Got it — Berwick, VIC 3806, Kitchen splashback, Porcelain, 3m², I'm buying the tiles. All correct?",
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
    "jobType": "kitchen_splashback",
    "tileType": "porcelain",
    "areaSqm": 3,
    "supply": "labour_only",
    "removal": "none",
    "waterproofing": "none",
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
      "lastQuestion": "Got it — Berwick, VIC 3806, Kitchen splashback, Porcelain, 3m², I'm buying the tiles. All correct?",
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
      "answers": 0,
      "history": [
        {
          "you": "I need a tiling quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having tiled?"
        },
        {
          "you": "3",
          "me": "Who's buying the tiles?"
        }
      ],
      "trade": "tiling"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Kitchen splashback"
    },
    "tileType": {
      "title": "Tile",
      "value": "Porcelain"
    },
    "areaSqm": {
      "title": "Area",
      "value": "3m²"
    },
    "supply": {
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    "removal": {
      "title": "Old tiles",
      "value": "Nothing to remove"
    },
    "waterproofing": {
      "title": "Waterproofing",
      "value": "None"
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
      "value": "Kitchen splashback"
    },
    {
      "key": "tileType",
      "title": "Tile",
      "value": "Porcelain"
    },
    {
      "key": "areaSqm",
      "title": "Area",
      "value": "3m²"
    },
    {
      "key": "supply",
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles",
      "value": "Nothing to remove"
    },
    {
      "key": "waterproofing",
      "title": "Waterproofing",
      "value": "None"
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
  "type": "question",
  "message": "Nobody near you does kitchen splashback in Porcelain. The closest they can do is floor only in Porcelain, $350 from Paky Tiles. Want one of these instead?",
  "options": [
    {
      "label": "Porcelain, Floor only · $350",
      "value": "alt:porcelain:floor_only"
    },
    {
      "label": "Porcelain, Bathroom · $4,850",
      "value": "alt:porcelain:bathroom"
    },
    {
      "label": "No thanks, I'll change something",
      "value": "no"
    }
  ],
  "noMatchReason": "alternative",
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "kitchen_splashback",
    "tileType": "porcelain",
    "areaSqm": 3,
    "supply": "labour_only",
    "removal": "none",
    "waterproofing": "none",
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
      "lastAsked": "alternative",
      "lastQuestion": "alternatives",
      "lastValues": [
        "alt:porcelain:floor_only",
        "alt:porcelain:bathroom"
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
      "answers": 0,
      "history": [
        {
          "you": "I need a tiling quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having tiled?"
        },
        {
          "you": "3",
          "me": "Who's buying the tiles?"
        }
      ],
      "trade": "tiling"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "Kitchen splashback"
    },
    "tileType": {
      "title": "Tile",
      "value": "Porcelain"
    },
    "areaSqm": {
      "title": "Area",
      "value": "3m²"
    },
    "supply": {
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    "removal": {
      "title": "Old tiles",
      "value": "Nothing to remove"
    },
    "waterproofing": {
      "title": "Waterproofing",
      "value": "None"
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
      "value": "Kitchen splashback"
    },
    {
      "key": "tileType",
      "title": "Tile",
      "value": "Porcelain"
    },
    {
      "key": "areaSqm",
      "title": "Area",
      "value": "3m²"
    },
    {
      "key": "supply",
      "title": "Tiles",
      "value": "I'm buying the tiles"
    },
    {
      "key": "removal",
      "title": "Old tiles",
      "value": "Nothing to remove"
    },
    {
      "key": "waterproofing",
      "title": "Waterproofing",
      "value": "None"
    },
    {
      "key": "conditions",
      "title": "Site conditions",
      "value": "Nothing tricky"
    }
  ],
  "checklistPending": [],
  "results": [],
  "avgRatePerMeter": null,
  "alternatives": [
    {
      "material": "porcelain",
      "materialLabel": "Porcelain",
      "heightKey": "floor_only",
      "businessId": "tile-1",
      "businessName": "Paky Tiles",
      "estimatedTotal": 350,
      "value": "alt:porcelain:floor_only"
    },
    {
      "material": "porcelain",
      "materialLabel": "Porcelain",
      "heightKey": "bathroom",
      "businessId": "tile-1",
      "businessName": "Paky Tiles",
      "estimatedTotal": 4850,
      "value": "alt:porcelain:bathroom"
    }
  ]
}
```
