# 32 kitchen, nobody prices a kitchen that size

Guards: the no-match sentence is kitchen's own - never a fence height and never a tile

## turn 1

customer: "I need a kitchen quote"

```json
{
  "sessionId": "golden",
  "trade": "kitchen",
  "intent": "new_quote",
  "place": null,
  "type": "message",
  "message": "Happy to help with that. Mind if I ask a few quick questions?",
  "options": [],
  "checklistComplete": false,
  "checklist": {
    "suburb": null,
    "jobType": null,
    "kitchenSize": null,
    "supply": null,
    "benchtop": null,
    "removal": null,
    "extras": null,
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
          "you": "I need a kitchen quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        }
      ],
      "trade": "kitchen"
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
      "key": "kitchenSize",
      "title": "Size"
    },
    {
      "key": "supply",
      "title": "Cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop"
    },
    {
      "key": "removal",
      "title": "Old kitchen"
    },
    {
      "key": "extras",
      "title": "Extras"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item"
}
```

## turn 2

customer: "yes go ahead"

```json
{
  "sessionId": "golden",
  "trade": "kitchen",
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
    "kitchenSize": null,
    "supply": null,
    "benchtop": null,
    "removal": null,
    "extras": null,
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
          "you": "I need a kitchen quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        }
      ],
      "trade": "kitchen"
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
      "key": "kitchenSize",
      "title": "Size"
    },
    {
      "key": "supply",
      "title": "Cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop"
    },
    {
      "key": "removal",
      "title": "Old kitchen"
    },
    {
      "key": "extras",
      "title": "Extras"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item"
}
```

## turn 3

customer: "Berwick"
picked place: Berwick, VIC 3806

```json
{
  "sessionId": "golden",
  "trade": "kitchen",
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
  "message": "What are you having done?",
  "options": [
    {
      "label": "A brand new kitchen",
      "value": "new_kitchen"
    },
    {
      "label": "Replacing the old one",
      "value": "replacement"
    },
    {
      "label": "Fitting one I've bought",
      "value": "install_only"
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
    "kitchenSize": null,
    "supply": null,
    "benchtop": null,
    "removal": null,
    "extras": null,
    "existingPrice": null,
    "_ui": {
      "turn": 3,
      "cursor": {
        "jobType": 0
      },
      "lastAsked": "jobType",
      "lastQuestion": "What are you having done?",
      "lastValues": [
        "new_kitchen",
        "replacement",
        "install_only",
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
          "you": "I need a kitchen quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having done?"
        }
      ],
      "trade": "kitchen"
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
      "key": "kitchenSize",
      "title": "Size"
    },
    {
      "key": "supply",
      "title": "Cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop"
    },
    {
      "key": "removal",
      "title": "Old kitchen"
    },
    {
      "key": "extras",
      "title": "Extras"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item"
}
```

## turn 4

customer: "new_kitchen"

```json
{
  "sessionId": "golden",
  "trade": "kitchen",
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
  "message": "Roughly how big is the kitchen?",
  "options": [
    {
      "label": "Small — a galley or one run",
      "value": "small"
    },
    {
      "label": "Standard — an L-shape",
      "value": "standard"
    },
    {
      "label": "Large — a U-shape or an island",
      "value": "large"
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "new_kitchen",
    "kitchenSize": null,
    "supply": null,
    "benchtop": null,
    "removal": null,
    "extras": null,
    "existingPrice": null,
    "_ui": {
      "turn": 4,
      "cursor": {
        "jobType": 0,
        "kitchenSize": 0
      },
      "lastAsked": "kitchenSize",
      "lastQuestion": "Roughly how big is the kitchen?",
      "lastValues": [
        "small",
        "standard",
        "large",
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
          "you": "I need a kitchen quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having done?"
        }
      ],
      "trade": "kitchen"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "A brand new kitchen"
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
      "value": "A brand new kitchen"
    }
  ],
  "checklistPending": [
    {
      "key": "kitchenSize",
      "title": "Size"
    },
    {
      "key": "supply",
      "title": "Cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop"
    },
    {
      "key": "removal",
      "title": "Old kitchen"
    },
    {
      "key": "extras",
      "title": "Extras"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item"
}
```

## turn 5

customer: "large"

```json
{
  "sessionId": "golden",
  "trade": "kitchen",
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
  "message": "Who's supplying the cabinets?",
  "options": [
    {
      "label": "They supply the cabinets",
      "value": "supply_and_install"
    },
    {
      "label": "I'm supplying the cabinets",
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
    "jobType": "new_kitchen",
    "kitchenSize": "large",
    "supply": null,
    "benchtop": null,
    "removal": null,
    "extras": null,
    "existingPrice": null,
    "_ui": {
      "turn": 5,
      "cursor": {
        "jobType": 0,
        "kitchenSize": 0,
        "supply": 0
      },
      "lastAsked": "supply",
      "lastQuestion": "Who's supplying the cabinets?",
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
          "you": "I need a kitchen quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having done?"
        }
      ],
      "trade": "kitchen"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "A brand new kitchen"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Large — a U-shape or an island"
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
      "value": "A brand new kitchen"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Large — a U-shape or an island"
    }
  ],
  "checklistPending": [
    {
      "key": "supply",
      "title": "Cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop"
    },
    {
      "key": "removal",
      "title": "Old kitchen"
    },
    {
      "key": "extras",
      "title": "Extras"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item"
}
```

## turn 6

customer: "labour_only"

```json
{
  "sessionId": "golden",
  "trade": "kitchen",
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
  "message": "What benchtop are you after?",
  "options": [
    {
      "label": "Laminate",
      "value": "laminate"
    },
    {
      "label": "Timber",
      "value": "timber"
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
    "jobType": "new_kitchen",
    "kitchenSize": "large",
    "supply": "labour_only",
    "benchtop": null,
    "removal": null,
    "extras": null,
    "existingPrice": null,
    "_ui": {
      "turn": 6,
      "cursor": {
        "jobType": 0,
        "kitchenSize": 0,
        "supply": 0,
        "benchtop": 0
      },
      "lastAsked": "benchtop",
      "lastQuestion": "What benchtop are you after?",
      "lastValues": [
        "laminate",
        "timber",
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
          "you": "I need a kitchen quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having done?"
        }
      ],
      "trade": "kitchen"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "A brand new kitchen"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    "supply": {
      "title": "Cabinets",
      "value": "I'm supplying the cabinets"
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
      "value": "A brand new kitchen"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    {
      "key": "supply",
      "title": "Cabinets",
      "value": "I'm supplying the cabinets"
    }
  ],
  "checklistPending": [
    {
      "key": "benchtop",
      "title": "Benchtop"
    },
    {
      "key": "removal",
      "title": "Old kitchen"
    },
    {
      "key": "extras",
      "title": "Extras"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item"
}
```

## turn 7

customer: "none"

```json
{
  "sessionId": "golden",
  "trade": "kitchen",
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
  "message": "Is there an old kitchen to take out?",
  "options": [
    {
      "label": "Yes, take it out",
      "value": "any"
    },
    {
      "label": "Everything — cabinets, bench, splashback",
      "value": "full_demolition"
    },
    {
      "label": "Nothing to take out",
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
    "jobType": "new_kitchen",
    "kitchenSize": "large",
    "supply": "labour_only",
    "benchtop": "none",
    "removal": null,
    "extras": null,
    "existingPrice": null,
    "_ui": {
      "turn": 7,
      "cursor": {
        "jobType": 0,
        "kitchenSize": 0,
        "supply": 0,
        "benchtop": 0,
        "removal": 0
      },
      "lastAsked": "removal",
      "lastQuestion": "Is there an old kitchen to take out?",
      "lastValues": [
        "any",
        "full_demolition",
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
          "you": "I need a kitchen quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having done?"
        }
      ],
      "trade": "kitchen"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "A brand new kitchen"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    "supply": {
      "title": "Cabinets",
      "value": "I'm supplying the cabinets"
    },
    "benchtop": {
      "title": "Benchtop",
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
      "value": "A brand new kitchen"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    {
      "key": "supply",
      "title": "Cabinets",
      "value": "I'm supplying the cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop",
      "value": "None"
    }
  ],
  "checklistPending": [
    {
      "key": "removal",
      "title": "Old kitchen"
    },
    {
      "key": "extras",
      "title": "Extras"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item"
}
```

## turn 8

customer: "none"

```json
{
  "sessionId": "golden",
  "trade": "kitchen",
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
  "message": "Anything else in the job?",
  "options": [
    {
      "label": "An island",
      "value": "island"
    },
    {
      "label": "A pantry",
      "value": "pantry"
    },
    {
      "label": "Nothing else",
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
    "jobType": "new_kitchen",
    "kitchenSize": "large",
    "supply": "labour_only",
    "benchtop": "none",
    "removal": "none",
    "extras": null,
    "existingPrice": null,
    "_ui": {
      "turn": 8,
      "cursor": {
        "jobType": 0,
        "kitchenSize": 0,
        "supply": 0,
        "benchtop": 0,
        "removal": 0,
        "extras": 0
      },
      "lastAsked": "extras",
      "lastQuestion": "Anything else in the job?",
      "lastValues": [
        "island",
        "pantry",
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
          "you": "I need a kitchen quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having done?"
        }
      ],
      "trade": "kitchen"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "A brand new kitchen"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    "supply": {
      "title": "Cabinets",
      "value": "I'm supplying the cabinets"
    },
    "benchtop": {
      "title": "Benchtop",
      "value": "None"
    },
    "removal": {
      "title": "Old kitchen",
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
      "value": "A brand new kitchen"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    {
      "key": "supply",
      "title": "Cabinets",
      "value": "I'm supplying the cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop",
      "value": "None"
    },
    {
      "key": "removal",
      "title": "Old kitchen",
      "value": "Nothing to remove"
    }
  ],
  "checklistPending": [
    {
      "key": "extras",
      "title": "Extras"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item"
}
```

## turn 9

customer: "none"

```json
{
  "sessionId": "golden",
  "trade": "kitchen",
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
  "message": "Got it — Berwick, VIC 3806, A brand new kitchen, Large — a U-shape or an island, I'm supplying the cabinets. All correct?",
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
    "jobType": "new_kitchen",
    "kitchenSize": "large",
    "supply": "labour_only",
    "benchtop": "none",
    "removal": "none",
    "extras": [],
    "existingPrice": null,
    "_ui": {
      "turn": 9,
      "cursor": {
        "jobType": 0,
        "kitchenSize": 0,
        "supply": 0,
        "benchtop": 0,
        "removal": 0,
        "extras": 0
      },
      "lastAsked": null,
      "lastQuestion": "Got it — Berwick, VIC 3806, A brand new kitchen, Large — a U-shape or an island, I'm supplying the cabinets. All correct?",
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
          "you": "I need a kitchen quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having done?"
        }
      ],
      "trade": "kitchen"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "A brand new kitchen"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    "supply": {
      "title": "Cabinets",
      "value": "I'm supplying the cabinets"
    },
    "benchtop": {
      "title": "Benchtop",
      "value": "None"
    },
    "removal": {
      "title": "Old kitchen",
      "value": "Nothing to remove"
    },
    "extras": {
      "title": "Extras",
      "value": ""
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
      "value": "A brand new kitchen"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    {
      "key": "supply",
      "title": "Cabinets",
      "value": "I'm supplying the cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop",
      "value": "None"
    },
    {
      "key": "removal",
      "title": "Old kitchen",
      "value": "Nothing to remove"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": ""
    }
  ],
  "checklistPending": [],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item"
}
```

## turn 10

customer: "yes"

```json
{
  "sessionId": "golden",
  "trade": "kitchen",
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
  "message": "Nobody near you publishes a price for a kitchen that size. Want to try a different one?",
  "options": [],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item",
  "comparison": null,
  "noMatchReason": "height",
  "checklistComplete": true,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "new_kitchen",
    "kitchenSize": "large",
    "supply": "labour_only",
    "benchtop": "none",
    "removal": "none",
    "extras": [],
    "existingPrice": null,
    "_ui": {
      "turn": 10,
      "cursor": {
        "jobType": 0,
        "kitchenSize": 0,
        "supply": 0,
        "benchtop": 0,
        "removal": 0,
        "extras": 0
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
      "answers": 0,
      "history": [
        {
          "you": "I need a kitchen quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What are you having done?"
        }
      ],
      "trade": "kitchen"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job",
      "value": "A brand new kitchen"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    "supply": {
      "title": "Cabinets",
      "value": "I'm supplying the cabinets"
    },
    "benchtop": {
      "title": "Benchtop",
      "value": "None"
    },
    "removal": {
      "title": "Old kitchen",
      "value": "Nothing to remove"
    },
    "extras": {
      "title": "Extras",
      "value": ""
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
      "value": "A brand new kitchen"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    {
      "key": "supply",
      "title": "Cabinets",
      "value": "I'm supplying the cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop",
      "value": "None"
    },
    {
      "key": "removal",
      "title": "Old kitchen",
      "value": "Nothing to remove"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": ""
    }
  ],
  "checklistPending": []
}
```
