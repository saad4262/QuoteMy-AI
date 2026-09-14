# 40 retaining wall, installation only, the customer buys the sleepers

Guards: the fourth trade end to end: its own questions in its own order, supply asked SECOND because it picks the rate table, and a per-linear-metre total off the cheaper of the two columns

## turn 1

customer: "I need a retaining wall quote"

```json
{
  "sessionId": "golden",
  "trade": "retaining_wall",
  "intent": "new_quote",
  "place": null,
  "type": "message",
  "message": "Happy to help with that. Mind if I ask a few quick questions?",
  "options": [],
  "checklistComplete": false,
  "checklist": {
    "suburb": null,
    "wallType": null,
    "supply": null,
    "lengthMeters": null,
    "heightKey": null,
    "removal": null,
    "drainage": null,
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
          "you": "I need a retaining wall quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        }
      ],
      "trade": "retaining_wall"
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
      "key": "wallType",
      "title": "Wall type"
    },
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "lengthMeters",
      "title": "Length"
    },
    {
      "key": "heightKey",
      "title": "Height"
    },
    {
      "key": "removal",
      "title": "Old wall"
    },
    {
      "key": "drainage",
      "title": "Drainage"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m"
}
```

## turn 2

customer: "yes go ahead"

```json
{
  "sessionId": "golden",
  "trade": "retaining_wall",
  "intent": "new_quote",
  "place": null,
  "type": "message",
  "message": "Which suburb is the wall going in? A postcode works too.",
  "options": [],
  "expects": "suburb",
  "checklistComplete": false,
  "checklist": {
    "suburb": null,
    "wallType": null,
    "supply": null,
    "lengthMeters": null,
    "heightKey": null,
    "removal": null,
    "drainage": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 2,
      "cursor": {},
      "lastAsked": "suburb",
      "lastQuestion": "Which suburb is the wall going in? A postcode works too.",
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
          "you": "I need a retaining wall quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the wall going in? A postcode works too."
        }
      ],
      "trade": "retaining_wall"
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
      "key": "wallType",
      "title": "Wall type"
    },
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "lengthMeters",
      "title": "Length"
    },
    {
      "key": "heightKey",
      "title": "Height"
    },
    {
      "key": "removal",
      "title": "Old wall"
    },
    {
      "key": "drainage",
      "title": "Drainage"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m"
}
```

## turn 3

customer: "Berwick"
picked place: Berwick, VIC 3806

```json
{
  "sessionId": "golden",
  "trade": "retaining_wall",
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
  "message": "What sort of retaining wall are you after?",
  "options": [
    {
      "label": "Timber sleepers",
      "value": "timber_sleeper"
    },
    {
      "label": "Concrete sleepers",
      "value": "concrete_sleeper"
    },
    {
      "label": "Steel posts with sleepers",
      "value": "steel_post"
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
    "wallType": null,
    "supply": null,
    "lengthMeters": null,
    "heightKey": null,
    "removal": null,
    "drainage": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 3,
      "cursor": {
        "wallType": 0
      },
      "lastAsked": "wallType",
      "lastQuestion": "What sort of retaining wall are you after?",
      "lastValues": [
        "timber_sleeper",
        "concrete_sleeper",
        "steel_post",
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
          "you": "I need a retaining wall quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the wall going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What sort of retaining wall are you after?"
        }
      ],
      "trade": "retaining_wall"
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
      "key": "wallType",
      "title": "Wall type"
    },
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "lengthMeters",
      "title": "Length"
    },
    {
      "key": "heightKey",
      "title": "Height"
    },
    {
      "key": "removal",
      "title": "Old wall"
    },
    {
      "key": "drainage",
      "title": "Drainage"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m"
}
```

## turn 4

customer: "concrete_sleeper"

```json
{
  "sessionId": "golden",
  "trade": "retaining_wall",
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
  "message": "Who's buying the materials?",
  "options": [
    {
      "label": "They supply the materials",
      "value": "supply_and_install"
    },
    {
      "label": "I'm buying the materials",
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
    "wallType": "concrete_sleeper",
    "supply": null,
    "lengthMeters": null,
    "heightKey": null,
    "removal": null,
    "drainage": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 4,
      "cursor": {
        "wallType": 0,
        "supply": 0
      },
      "lastAsked": "supply",
      "lastQuestion": "Who's buying the materials?",
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
          "you": "I need a retaining wall quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the wall going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What sort of retaining wall are you after?"
        }
      ],
      "trade": "retaining_wall"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "wallType": {
      "title": "Wall type",
      "value": "Concrete sleepers"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "wallType",
      "title": "Wall type",
      "value": "Concrete sleepers"
    }
  ],
  "checklistPending": [
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "lengthMeters",
      "title": "Length"
    },
    {
      "key": "heightKey",
      "title": "Height"
    },
    {
      "key": "removal",
      "title": "Old wall"
    },
    {
      "key": "drainage",
      "title": "Drainage"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m"
}
```

## turn 5

customer: "labour_only"

```json
{
  "sessionId": "golden",
  "trade": "retaining_wall",
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
  "message": "How long is the wall?",
  "options": [
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "wallType": "concrete_sleeper",
    "supply": "labour_only",
    "lengthMeters": null,
    "heightKey": null,
    "removal": null,
    "drainage": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 5,
      "cursor": {
        "wallType": 0,
        "supply": 0,
        "lengthMeters": 0
      },
      "lastAsked": "lengthMeters",
      "lastQuestion": "How long is the wall?",
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
          "you": "I need a retaining wall quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the wall going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What sort of retaining wall are you after?"
        }
      ],
      "trade": "retaining_wall"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "wallType": {
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm buying the materials"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "wallType",
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm buying the materials"
    }
  ],
  "checklistPending": [
    {
      "key": "lengthMeters",
      "title": "Length"
    },
    {
      "key": "heightKey",
      "title": "Height"
    },
    {
      "key": "removal",
      "title": "Old wall"
    },
    {
      "key": "drainage",
      "title": "Drainage"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m"
}
```

## turn 6

customer: "20"

```json
{
  "sessionId": "golden",
  "trade": "retaining_wall",
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
  "message": "Roughly how high does it need to hold back?",
  "options": [
    {
      "label": "0.6m",
      "value": "0.6m"
    },
    {
      "label": "0.9m",
      "value": "0.9m"
    },
    {
      "label": "1.2m",
      "value": "1.2m"
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
    "wallType": "concrete_sleeper",
    "supply": "labour_only",
    "lengthMeters": 20,
    "heightKey": null,
    "removal": null,
    "drainage": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 6,
      "cursor": {
        "wallType": 0,
        "supply": 0,
        "lengthMeters": 0,
        "heightKey": 0
      },
      "lastAsked": "heightKey",
      "lastQuestion": "Roughly how high does it need to hold back?",
      "lastValues": [
        "0.6m",
        "0.9m",
        "1.2m",
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
          "you": "I need a retaining wall quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the wall going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What sort of retaining wall are you after?"
        },
        {
          "you": "20",
          "me": "Roughly how high does it need to hold back?"
        }
      ],
      "trade": "retaining_wall"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "wallType": {
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm buying the materials"
    },
    "lengthMeters": {
      "title": "Length",
      "value": "20m"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "wallType",
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm buying the materials"
    },
    {
      "key": "lengthMeters",
      "title": "Length",
      "value": "20m"
    }
  ],
  "checklistPending": [
    {
      "key": "heightKey",
      "title": "Height"
    },
    {
      "key": "removal",
      "title": "Old wall"
    },
    {
      "key": "drainage",
      "title": "Drainage"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m"
}
```

## turn 7

customer: "0.9m"

```json
{
  "sessionId": "golden",
  "trade": "retaining_wall",
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
  "message": "Is there an old wall to take out?",
  "options": [
    {
      "label": "Yes, take it out",
      "value": "any"
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
    "wallType": "concrete_sleeper",
    "supply": "labour_only",
    "lengthMeters": 20,
    "heightKey": "0.9m",
    "removal": null,
    "drainage": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 7,
      "cursor": {
        "wallType": 0,
        "supply": 0,
        "lengthMeters": 0,
        "heightKey": 0,
        "removal": 0
      },
      "lastAsked": "removal",
      "lastQuestion": "Is there an old wall to take out?",
      "lastValues": [
        "any",
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
          "you": "I need a retaining wall quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the wall going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What sort of retaining wall are you after?"
        },
        {
          "you": "20",
          "me": "Roughly how high does it need to hold back?"
        }
      ],
      "trade": "retaining_wall"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "wallType": {
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm buying the materials"
    },
    "lengthMeters": {
      "title": "Length",
      "value": "20m"
    },
    "heightKey": {
      "title": "Height",
      "value": "0.9m"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "wallType",
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm buying the materials"
    },
    {
      "key": "lengthMeters",
      "title": "Length",
      "value": "20m"
    },
    {
      "key": "heightKey",
      "title": "Height",
      "value": "0.9m"
    }
  ],
  "checklistPending": [
    {
      "key": "removal",
      "title": "Old wall"
    },
    {
      "key": "drainage",
      "title": "Drainage"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m"
}
```

## turn 8

customer: "none"

```json
{
  "sessionId": "golden",
  "trade": "retaining_wall",
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
  "message": "Do you want drainage behind it?",
  "options": [
    {
      "label": "Yes — the standard drainage",
      "value": "full_package"
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
    "wallType": "concrete_sleeper",
    "supply": "labour_only",
    "lengthMeters": 20,
    "heightKey": "0.9m",
    "removal": "none",
    "drainage": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 8,
      "cursor": {
        "wallType": 0,
        "supply": 0,
        "lengthMeters": 0,
        "heightKey": 0,
        "removal": 0,
        "drainage": 0
      },
      "lastAsked": "drainage",
      "lastQuestion": "Do you want drainage behind it?",
      "lastValues": [
        "full_package",
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
          "you": "I need a retaining wall quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the wall going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What sort of retaining wall are you after?"
        },
        {
          "you": "20",
          "me": "Roughly how high does it need to hold back?"
        }
      ],
      "trade": "retaining_wall"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "wallType": {
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm buying the materials"
    },
    "lengthMeters": {
      "title": "Length",
      "value": "20m"
    },
    "heightKey": {
      "title": "Height",
      "value": "0.9m"
    },
    "removal": {
      "title": "Old wall",
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
      "key": "wallType",
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm buying the materials"
    },
    {
      "key": "lengthMeters",
      "title": "Length",
      "value": "20m"
    },
    {
      "key": "heightKey",
      "title": "Height",
      "value": "0.9m"
    },
    {
      "key": "removal",
      "title": "Old wall",
      "value": "Nothing to remove"
    }
  ],
  "checklistPending": [
    {
      "key": "drainage",
      "title": "Drainage"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m"
}
```

## turn 9

customer: "none"

```json
{
  "sessionId": "golden",
  "trade": "retaining_wall",
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
      "label": "Rocky ground",
      "value": "rock"
    },
    {
      "label": "Nothing tricky",
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
    "wallType": "concrete_sleeper",
    "supply": "labour_only",
    "lengthMeters": 20,
    "heightKey": "0.9m",
    "removal": "none",
    "drainage": "none",
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 9,
      "cursor": {
        "wallType": 0,
        "supply": 0,
        "lengthMeters": 0,
        "heightKey": 0,
        "removal": 0,
        "drainage": 0,
        "conditions": 0
      },
      "lastAsked": "conditions",
      "lastQuestion": "Anything tricky about the site?",
      "lastValues": [
        "restricted_access",
        "rock",
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
          "you": "I need a retaining wall quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the wall going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What sort of retaining wall are you after?"
        },
        {
          "you": "20",
          "me": "Roughly how high does it need to hold back?"
        }
      ],
      "trade": "retaining_wall"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "wallType": {
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm buying the materials"
    },
    "lengthMeters": {
      "title": "Length",
      "value": "20m"
    },
    "heightKey": {
      "title": "Height",
      "value": "0.9m"
    },
    "removal": {
      "title": "Old wall",
      "value": "Nothing to remove"
    },
    "drainage": {
      "title": "Drainage",
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
      "key": "wallType",
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm buying the materials"
    },
    {
      "key": "lengthMeters",
      "title": "Length",
      "value": "20m"
    },
    {
      "key": "heightKey",
      "title": "Height",
      "value": "0.9m"
    },
    {
      "key": "removal",
      "title": "Old wall",
      "value": "Nothing to remove"
    },
    {
      "key": "drainage",
      "title": "Drainage",
      "value": "None"
    }
  ],
  "checklistPending": [
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m"
}
```

## turn 10

customer: "none"

```json
{
  "sessionId": "golden",
  "trade": "retaining_wall",
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
  "message": "Got it — Berwick, VIC 3806, Concrete sleepers, I'm buying the materials, 20m, 0.9m. All correct?",
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
    "wallType": "concrete_sleeper",
    "supply": "labour_only",
    "lengthMeters": 20,
    "heightKey": "0.9m",
    "removal": "none",
    "drainage": "none",
    "conditions": [],
    "existingPrice": null,
    "_ui": {
      "turn": 10,
      "cursor": {
        "wallType": 0,
        "supply": 0,
        "lengthMeters": 0,
        "heightKey": 0,
        "removal": 0,
        "drainage": 0,
        "conditions": 0
      },
      "lastAsked": null,
      "lastQuestion": "Got it — Berwick, VIC 3806, Concrete sleepers, I'm buying the materials, 20m, 0.9m. All correct?",
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
          "you": "I need a retaining wall quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the wall going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What sort of retaining wall are you after?"
        },
        {
          "you": "20",
          "me": "Roughly how high does it need to hold back?"
        }
      ],
      "trade": "retaining_wall"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "wallType": {
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm buying the materials"
    },
    "lengthMeters": {
      "title": "Length",
      "value": "20m"
    },
    "heightKey": {
      "title": "Height",
      "value": "0.9m"
    },
    "removal": {
      "title": "Old wall",
      "value": "Nothing to remove"
    },
    "drainage": {
      "title": "Drainage",
      "value": "None"
    },
    "conditions": {
      "title": "Site",
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
      "key": "wallType",
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm buying the materials"
    },
    {
      "key": "lengthMeters",
      "title": "Length",
      "value": "20m"
    },
    {
      "key": "heightKey",
      "title": "Height",
      "value": "0.9m"
    },
    {
      "key": "removal",
      "title": "Old wall",
      "value": "Nothing to remove"
    },
    {
      "key": "drainage",
      "title": "Drainage",
      "value": "None"
    },
    {
      "key": "conditions",
      "title": "Site",
      "value": "Nothing tricky"
    }
  ],
  "checklistPending": [],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m"
}
```

## turn 11

customer: "yes"

```json
{
  "sessionId": "golden",
  "trade": "retaining_wall",
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
      "businessId": "wall-1",
      "autoAcceptsAi": true,
      "businessName": "Berwick Retaining Wall",
      "suburb": "Berwick, VIC 3806",
      "ratePerMeter": 185,
      "estimatedTotal": 3850,
      "notes": "incl. GST · In your suburb · 4.8★ (52) · You supply the materials · Includes $150 site inspection"
    }
  ],
  "avgRatePerMeter": 185,
  "unit": "m",
  "comparison": {
    "potentialSavings": null,
    "marketAverage": 3850,
    "totalQuotesScreened": 1,
    "userExistingPrice": null,
    "quotes": [
      {
        "businessId": "wall-1",
        "autoAcceptsAi": true,
        "businessName": "Berwick Retaining Wall",
        "ratePerMeter": 185,
        "projectTotalMin": 3850,
        "projectTotalMax": 3850,
        "badges": [
          "incl. GST",
          "In your suburb",
          "4.8★ (52)",
          "You supply the materials",
          "Includes $150 site inspection"
        ],
        "warranty": "Ten year workmanship warranty",
        "tag": "BEST_VALUE",
        "savingsFromAverage": null,
        "suburb": "Berwick, VIC 3806"
      }
    ]
  },
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "wallType": "concrete_sleeper",
    "supply": "labour_only",
    "lengthMeters": 20,
    "heightKey": "0.9m",
    "removal": "none",
    "drainage": "none",
    "conditions": [],
    "existingPrice": null,
    "_ui": {
      "turn": 11,
      "cursor": {
        "wallType": 0,
        "supply": 0,
        "lengthMeters": 0,
        "heightKey": 0,
        "removal": 0,
        "drainage": 0,
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
      "answers": 0,
      "history": [
        {
          "you": "I need a retaining wall quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the wall going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "What sort of retaining wall are you after?"
        },
        {
          "you": "20",
          "me": "Roughly how high does it need to hold back?"
        }
      ],
      "trade": "retaining_wall"
    }
  },
  "checklistComplete": true,
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "wallType": {
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm buying the materials"
    },
    "lengthMeters": {
      "title": "Length",
      "value": "20m"
    },
    "heightKey": {
      "title": "Height",
      "value": "0.9m"
    },
    "removal": {
      "title": "Old wall",
      "value": "Nothing to remove"
    },
    "drainage": {
      "title": "Drainage",
      "value": "None"
    },
    "conditions": {
      "title": "Site",
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
      "key": "wallType",
      "title": "Wall type",
      "value": "Concrete sleepers"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm buying the materials"
    },
    {
      "key": "lengthMeters",
      "title": "Length",
      "value": "20m"
    },
    {
      "key": "heightKey",
      "title": "Height",
      "value": "0.9m"
    },
    {
      "key": "removal",
      "title": "Old wall",
      "value": "Nothing to remove"
    },
    {
      "key": "drainage",
      "title": "Drainage",
      "value": "None"
    },
    {
      "key": "conditions",
      "title": "Site",
      "value": "Nothing tricky"
    }
  ],
  "checklistPending": []
}
```
