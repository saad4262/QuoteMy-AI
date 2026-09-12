# 33 kitchen, correcting the size from the recap

Guards: a correction re-asks one field and keeps the rest, on a trade whose corrected field is the one the price is found by

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
      "title": "Job type"
    },
    {
      "key": "kitchenSize",
      "title": "Size"
    },
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "benchtop",
      "title": "Benchtop"
    },
    {
      "key": "removal",
      "title": "Removal"
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
      "title": "Job type"
    },
    {
      "key": "kitchenSize",
      "title": "Size"
    },
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "benchtop",
      "title": "Benchtop"
    },
    {
      "key": "removal",
      "title": "Removal"
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
      "title": "Job type"
    },
    {
      "key": "kitchenSize",
      "title": "Size"
    },
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "benchtop",
      "title": "Benchtop"
    },
    {
      "key": "removal",
      "title": "Removal"
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

customer: "replacement"

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
    "jobType": "replacement",
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
      "title": "Job type",
      "value": "Replacing the old one"
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
      "title": "Job type",
      "value": "Replacing the old one"
    }
  ],
  "checklistPending": [
    {
      "key": "kitchenSize",
      "title": "Size"
    },
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "benchtop",
      "title": "Benchtop"
    },
    {
      "key": "removal",
      "title": "Removal"
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

customer: "small"

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
    "jobType": "replacement",
    "kitchenSize": "small",
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Small — a galley or one run"
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Small — a galley or one run"
    }
  ],
  "checklistPending": [
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "benchtop",
      "title": "Benchtop"
    },
    {
      "key": "removal",
      "title": "Removal"
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
      "label": "More options",
      "value": "__more__"
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "replacement",
    "kitchenSize": "small",
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
        "__more__",
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Small — a galley or one run"
    },
    "supply": {
      "title": "Who supplies",
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Small — a galley or one run"
    },
    {
      "key": "supply",
      "title": "Who supplies",
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
      "title": "Removal"
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

customer: "laminate"

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
      "label": "More options",
      "value": "__more__"
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "replacement",
    "kitchenSize": "small",
    "supply": "labour_only",
    "benchtop": "laminate",
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
        "__more__",
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Small — a galley or one run"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    "benchtop": {
      "title": "Benchtop",
      "value": "Laminate"
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Small — a galley or one run"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop",
      "value": "Laminate"
    }
  ],
  "checklistPending": [
    {
      "key": "removal",
      "title": "Removal"
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

customer: "cabinets_only"

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
      "label": "More options",
      "value": "__more__"
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "replacement",
    "kitchenSize": "small",
    "supply": "labour_only",
    "benchtop": "laminate",
    "removal": "cabinets_only",
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
        "__more__",
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
        },
        {
          "you": "cabinets_only",
          "me": "Anything else in the job?"
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Small — a galley or one run"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    "benchtop": {
      "title": "Benchtop",
      "value": "Laminate"
    },
    "removal": {
      "title": "Removal",
      "value": "Just the cabinets"
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Small — a galley or one run"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop",
      "value": "Laminate"
    },
    {
      "key": "removal",
      "title": "Removal",
      "value": "Just the cabinets"
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
  "message": "Got it — Berwick, VIC 3806, Replacing the old one, Small — a galley or one run, I'm supplying the cabinets, a laminate benchtop, taking out just the cabinets. All correct?",
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
    "jobType": "replacement",
    "kitchenSize": "small",
    "supply": "labour_only",
    "benchtop": "laminate",
    "removal": "cabinets_only",
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
      "lastQuestion": "Got it — Berwick, VIC 3806, Replacing the old one, Small — a galley or one run, I'm supplying the cabinets, a laminate benchtop, taking out just the cabinets. All correct?",
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
        },
        {
          "you": "cabinets_only",
          "me": "Anything else in the job?"
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Small — a galley or one run"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    "benchtop": {
      "title": "Benchtop",
      "value": "Laminate"
    },
    "removal": {
      "title": "Removal",
      "value": "Just the cabinets"
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Small — a galley or one run"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop",
      "value": "Laminate"
    },
    {
      "key": "removal",
      "title": "Removal",
      "value": "Just the cabinets"
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

customer: "no"

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
  "type": "message",
  "message": "No worries — what should I fix?",
  "options": [],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "jobType": "replacement",
    "kitchenSize": "small",
    "supply": "labour_only",
    "benchtop": "laminate",
    "removal": "cabinets_only",
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
      "lastQuestion": "No worries — what should I fix?",
      "lastValues": [],
      "lastType": "message",
      "fixing": true,
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
        },
        {
          "you": "cabinets_only",
          "me": "Anything else in the job?"
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Small — a galley or one run"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    "benchtop": {
      "title": "Benchtop",
      "value": "Laminate"
    },
    "removal": {
      "title": "Removal",
      "value": "Just the cabinets"
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Small — a galley or one run"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop",
      "value": "Laminate"
    },
    {
      "key": "removal",
      "title": "Removal",
      "value": "Just the cabinets"
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

## turn 11

customer: "the size is wrong"

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
    "jobType": "replacement",
    "kitchenSize": null,
    "supply": "labour_only",
    "benchtop": "laminate",
    "removal": "cabinets_only",
    "extras": [],
    "existingPrice": null,
    "_ui": {
      "turn": 11,
      "cursor": {
        "jobType": 0,
        "kitchenSize": 0,
        "supply": 0,
        "benchtop": 0,
        "removal": 0,
        "extras": 0
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
        },
        {
          "you": "cabinets_only",
          "me": "Anything else in the job?"
        },
        {
          "you": "the size is wrong",
          "me": "Roughly how big is the kitchen?"
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    "benchtop": {
      "title": "Benchtop",
      "value": "Laminate"
    },
    "removal": {
      "title": "Removal",
      "value": "Just the cabinets"
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop",
      "value": "Laminate"
    },
    {
      "key": "removal",
      "title": "Removal",
      "value": "Just the cabinets"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": ""
    }
  ],
  "checklistPending": [
    {
      "key": "kitchenSize",
      "title": "Size"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item"
}
```

## turn 12

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
  "type": "confirmation",
  "message": "Got it — Berwick, VIC 3806, Replacing the old one, Large — a U-shape or an island, I'm supplying the cabinets, a laminate benchtop, taking out just the cabinets. All correct?",
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
    "jobType": "replacement",
    "kitchenSize": "large",
    "supply": "labour_only",
    "benchtop": "laminate",
    "removal": "cabinets_only",
    "extras": [],
    "existingPrice": null,
    "_ui": {
      "turn": 12,
      "cursor": {
        "jobType": 0,
        "kitchenSize": 0,
        "supply": 0,
        "benchtop": 0,
        "removal": 0,
        "extras": 0
      },
      "lastAsked": null,
      "lastQuestion": "Got it — Berwick, VIC 3806, Replacing the old one, Large — a U-shape or an island, I'm supplying the cabinets, a laminate benchtop, taking out just the cabinets. All correct?",
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
        },
        {
          "you": "cabinets_only",
          "me": "Anything else in the job?"
        },
        {
          "you": "the size is wrong",
          "me": "Roughly how big is the kitchen?"
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    "benchtop": {
      "title": "Benchtop",
      "value": "Laminate"
    },
    "removal": {
      "title": "Removal",
      "value": "Just the cabinets"
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop",
      "value": "Laminate"
    },
    {
      "key": "removal",
      "title": "Removal",
      "value": "Just the cabinets"
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

## turn 13

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
  "message": "Here are the local businesses that cover your job.",
  "options": [],
  "results": [
    {
      "businessId": "kitchen-1",
      "autoAcceptsAi": true,
      "businessName": "Beky Kitchens",
      "suburb": "Berwick, VIC 3806",
      "ratePerMeter": 6170,
      "estimatedTotal": 6170,
      "notes": "incl. GST · 12.6 km away · 4.7★ (64) · You supply the cabinets · Old kitchen removed · Benchtop installed · Includes $120 site measure"
    }
  ],
  "avgRatePerMeter": 6170,
  "unit": "item",
  "comparison": {
    "potentialSavings": null,
    "marketAverage": 6170,
    "totalQuotesScreened": 1,
    "userExistingPrice": null,
    "quotes": [
      {
        "businessId": "kitchen-1",
        "autoAcceptsAi": true,
        "businessName": "Beky Kitchens",
        "ratePerMeter": 6170,
        "projectTotalMin": 6170,
        "projectTotalMax": 6170,
        "badges": [
          "incl. GST",
          "12.6 km away",
          "4.7★ (64)",
          "You supply the cabinets",
          "Old kitchen removed",
          "Benchtop installed",
          "Includes $120 site measure"
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
    "jobType": "replacement",
    "kitchenSize": "large",
    "supply": "labour_only",
    "benchtop": "laminate",
    "removal": "cabinets_only",
    "extras": [],
    "existingPrice": null,
    "_ui": {
      "turn": 13,
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
        },
        {
          "you": "cabinets_only",
          "me": "Anything else in the job?"
        },
        {
          "you": "the size is wrong",
          "me": "Roughly how big is the kitchen?"
        }
      ],
      "trade": "kitchen"
    }
  },
  "checklistComplete": true,
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "jobType": {
      "title": "Job type",
      "value": "Replacing the old one"
    },
    "kitchenSize": {
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    "benchtop": {
      "title": "Benchtop",
      "value": "Laminate"
    },
    "removal": {
      "title": "Removal",
      "value": "Just the cabinets"
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
      "title": "Job type",
      "value": "Replacing the old one"
    },
    {
      "key": "kitchenSize",
      "title": "Size",
      "value": "Large — a U-shape or an island"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the cabinets"
    },
    {
      "key": "benchtop",
      "title": "Benchtop",
      "value": "Laminate"
    },
    {
      "key": "removal",
      "title": "Removal",
      "value": "Just the cabinets"
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
