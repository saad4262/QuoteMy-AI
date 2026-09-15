# 66 renovation, one job nobody nearby prices

Guards: the honest refusal on the same path. This renovator publishes painting and flooring and does not publish plastering, so a customer wanting only plastering cannot be quoted by them - and must NOT be quoted a room renovation instead, which is exactly the silent substitution `single_trade` was added to stop. They are offered what IS priced

## turn 1

customer: "I need a renovation quote"

```json
{
  "sessionId": "golden",
  "trade": "home_renovation",
  "intent": "new_quote",
  "place": null,
  "type": "message",
  "message": "Happy to help with that. Mind if I ask a few quick questions?",
  "options": [],
  "checklistComplete": false,
  "checklist": {
    "suburb": null,
    "room": null,
    "jobType": null,
    "supply": null,
    "removal": null,
    "extras": null,
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
          "you": "I need a renovation quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        }
      ],
      "trade": "home_renovation"
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
      "key": "room",
      "title": "Room"
    },
    {
      "key": "jobType",
      "title": "Job"
    },
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "removal",
      "title": "Strip-out"
    },
    {
      "key": "extras",
      "title": "Extras"
    },
    {
      "key": "conditions",
      "title": "Site"
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
  "trade": "home_renovation",
  "intent": "new_quote",
  "place": null,
  "type": "message",
  "message": "Which suburb is the job in? A postcode works too.",
  "options": [],
  "expects": "suburb",
  "checklistComplete": false,
  "checklist": {
    "suburb": null,
    "room": null,
    "jobType": null,
    "supply": null,
    "removal": null,
    "extras": null,
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
          "you": "I need a renovation quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        }
      ],
      "trade": "home_renovation"
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
      "key": "room",
      "title": "Room"
    },
    {
      "key": "jobType",
      "title": "Job"
    },
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "removal",
      "title": "Strip-out"
    },
    {
      "key": "extras",
      "title": "Extras"
    },
    {
      "key": "conditions",
      "title": "Site"
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
  "trade": "home_renovation",
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
  "message": "Which room are you renovating?",
  "options": [
    {
      "label": "Bathroom",
      "value": "bathroom"
    },
    {
      "label": "Kitchen",
      "value": "kitchen"
    },
    {
      "label": "Ensuite",
      "value": "ensuite"
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
    "room": null,
    "jobType": null,
    "supply": null,
    "removal": null,
    "extras": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 3,
      "cursor": {
        "room": 0
      },
      "lastAsked": "room",
      "lastQuestion": "Which room are you renovating?",
      "lastValues": [
        "bathroom",
        "kitchen",
        "ensuite",
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
          "you": "I need a renovation quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "Which room are you renovating?"
        }
      ],
      "trade": "home_renovation"
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
      "key": "room",
      "title": "Room"
    },
    {
      "key": "jobType",
      "title": "Job"
    },
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "removal",
      "title": "Strip-out"
    },
    {
      "key": "extras",
      "title": "Extras"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item"
}
```

## turn 4

customer: "bedroom"

```json
{
  "sessionId": "golden",
  "trade": "home_renovation",
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
  "message": "What do you need done to it?",
  "options": [
    {
      "label": "The full renovation",
      "value": "full_renovation"
    },
    {
      "label": "Just strip it out",
      "value": "demolition_only"
    },
    {
      "label": "Fit out what I already have",
      "value": "fit_out_only"
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
    "room": "bedroom",
    "jobType": null,
    "supply": null,
    "removal": null,
    "extras": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 4,
      "cursor": {
        "room": 0,
        "jobType": 0
      },
      "lastAsked": "jobType",
      "lastQuestion": "What do you need done to it?",
      "lastValues": [
        "full_renovation",
        "demolition_only",
        "fit_out_only",
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
          "you": "I need a renovation quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "Which room are you renovating?"
        },
        {
          "you": "bedroom",
          "me": "What do you need done to it?"
        }
      ],
      "trade": "home_renovation"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "room": {
      "title": "Room",
      "value": "Bedroom"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "room",
      "title": "Room",
      "value": "Bedroom"
    }
  ],
  "checklistPending": [
    {
      "key": "jobType",
      "title": "Job"
    },
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "removal",
      "title": "Strip-out"
    },
    {
      "key": "extras",
      "title": "Extras"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item"
}
```

## turn 5

customer: "single_trade"

```json
{
  "sessionId": "golden",
  "trade": "home_renovation",
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
      "label": "Supply the materials and do the work",
      "value": "supply_and_install"
    },
    {
      "label": "I'm supplying the materials",
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
    "room": "bedroom",
    "jobType": "single_trade",
    "supply": null,
    "removal": null,
    "extras": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 5,
      "cursor": {
        "room": 0,
        "jobType": 0,
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
          "you": "I need a renovation quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "Which room are you renovating?"
        },
        {
          "you": "bedroom",
          "me": "What do you need done to it?"
        },
        {
          "you": "single_trade",
          "me": "Who's buying the materials?"
        }
      ],
      "trade": "home_renovation"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "room": {
      "title": "Room",
      "value": "Bedroom"
    },
    "jobType": {
      "title": "Job",
      "value": "Just one thing — painting, flooring, plastering"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "room",
      "title": "Room",
      "value": "Bedroom"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Just one thing — painting, flooring, plastering"
    }
  ],
  "checklistPending": [
    {
      "key": "supply",
      "title": "Who supplies"
    },
    {
      "key": "extras",
      "title": "Extras"
    },
    {
      "key": "conditions",
      "title": "Site"
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
  "trade": "home_renovation",
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
      "label": "Waterproofing",
      "value": "waterproofing"
    },
    {
      "label": "Tiling",
      "value": "tiling"
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
    "room": "bedroom",
    "jobType": "single_trade",
    "supply": "labour_only",
    "removal": null,
    "extras": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 6,
      "cursor": {
        "room": 0,
        "jobType": 0,
        "supply": 0,
        "extras": 0
      },
      "lastAsked": "extras",
      "lastQuestion": "Anything else in the job?",
      "lastValues": [
        "waterproofing",
        "tiling",
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
          "you": "I need a renovation quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "Which room are you renovating?"
        },
        {
          "you": "bedroom",
          "me": "What do you need done to it?"
        },
        {
          "you": "single_trade",
          "me": "Who's buying the materials?"
        }
      ],
      "trade": "home_renovation"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "room": {
      "title": "Room",
      "value": "Bedroom"
    },
    "jobType": {
      "title": "Job",
      "value": "Just one thing — painting, flooring, plastering"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "room",
      "title": "Room",
      "value": "Bedroom"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Just one thing — painting, flooring, plastering"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    }
  ],
  "checklistPending": [
    {
      "key": "extras",
      "title": "Extras"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "item"
}
```

## turn 7

customer: "plastering"

```json
{
  "sessionId": "golden",
  "trade": "home_renovation",
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
  "message": "Anything tricky we should know about?",
  "options": [
    {
      "label": "A wall that might be holding something up",
      "value": "structural_wall"
    },
    {
      "label": "Water damage or rot I know about",
      "value": "hidden_damage"
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
    "room": "bedroom",
    "jobType": "single_trade",
    "supply": "labour_only",
    "removal": null,
    "extras": [
      "plastering"
    ],
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 7,
      "cursor": {
        "room": 0,
        "jobType": 0,
        "supply": 0,
        "extras": 0,
        "conditions": 0
      },
      "lastAsked": "conditions",
      "lastQuestion": "Anything tricky we should know about?",
      "lastValues": [
        "structural_wall",
        "hidden_damage",
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
          "you": "I need a renovation quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "Which room are you renovating?"
        },
        {
          "you": "bedroom",
          "me": "What do you need done to it?"
        },
        {
          "you": "single_trade",
          "me": "Who's buying the materials?"
        },
        {
          "you": "plastering",
          "me": "Anything tricky we should know about?"
        }
      ],
      "trade": "home_renovation"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "room": {
      "title": "Room",
      "value": "Bedroom"
    },
    "jobType": {
      "title": "Job",
      "value": "Just one thing — painting, flooring, plastering"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    "extras": {
      "title": "Extras",
      "value": "Plastering"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "room",
      "title": "Room",
      "value": "Bedroom"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Just one thing — painting, flooring, plastering"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": "Plastering"
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
  "unit": "item"
}
```

## turn 8

customer: "none"

```json
{
  "sessionId": "golden",
  "trade": "home_renovation",
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
  "message": "Got it — Berwick, VIC 3806, Bedroom, Just one thing — painting, flooring, plastering, I'm supplying the materials, plastering. All correct?",
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
    "room": "bedroom",
    "jobType": "single_trade",
    "supply": "labour_only",
    "removal": null,
    "extras": [
      "plastering"
    ],
    "conditions": [],
    "existingPrice": null,
    "_ui": {
      "turn": 8,
      "cursor": {
        "room": 0,
        "jobType": 0,
        "supply": 0,
        "extras": 0,
        "conditions": 0
      },
      "lastAsked": null,
      "lastQuestion": "Got it — Berwick, VIC 3806, Bedroom, Just one thing — painting, flooring, plastering, I'm supplying the materials, plastering. All correct?",
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
          "you": "I need a renovation quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "Which room are you renovating?"
        },
        {
          "you": "bedroom",
          "me": "What do you need done to it?"
        },
        {
          "you": "single_trade",
          "me": "Who's buying the materials?"
        },
        {
          "you": "plastering",
          "me": "Anything tricky we should know about?"
        }
      ],
      "trade": "home_renovation"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "room": {
      "title": "Room",
      "value": "Bedroom"
    },
    "jobType": {
      "title": "Job",
      "value": "Just one thing — painting, flooring, plastering"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    "extras": {
      "title": "Extras",
      "value": "Plastering"
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
      "key": "room",
      "title": "Room",
      "value": "Bedroom"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Just one thing — painting, flooring, plastering"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": "Plastering"
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
  "unit": "item"
}
```

## turn 9

customer: "yes"

```json
{
  "sessionId": "golden",
  "trade": "home_renovation",
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
  "message": "Nobody near you does Bedroom for just one thing — painting, flooring, plastering. The closest they can do is Bedroom for the full renovation, $3,000 from Berwick Home Renovations. Want one of these instead?",
  "options": [
    {
      "label": "Bedroom, The full renovation · $3,000",
      "value": "alt:bedroom:full-renovation"
    },
    {
      "label": "Laundry, Just strip it out · $900",
      "value": "alt:laundry:demolition-only"
    },
    {
      "label": "Bathroom, Just strip it out · $1,600",
      "value": "alt:bathroom:demolition-only"
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
    "room": "bedroom",
    "jobType": "single_trade",
    "supply": "labour_only",
    "removal": null,
    "extras": [
      "plastering"
    ],
    "conditions": [],
    "existingPrice": null,
    "_ui": {
      "turn": 9,
      "cursor": {
        "room": 0,
        "jobType": 0,
        "supply": 0,
        "extras": 0,
        "conditions": 0
      },
      "lastAsked": "alternative",
      "lastQuestion": "alternatives",
      "lastValues": [
        "alt:bedroom:full-renovation",
        "alt:laundry:demolition-only",
        "alt:bathroom:demolition-only"
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
          "you": "I need a renovation quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the job in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "Which room are you renovating?"
        },
        {
          "you": "bedroom",
          "me": "What do you need done to it?"
        },
        {
          "you": "single_trade",
          "me": "Who's buying the materials?"
        },
        {
          "you": "plastering",
          "me": "Anything tricky we should know about?"
        }
      ],
      "trade": "home_renovation"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "room": {
      "title": "Room",
      "value": "Bedroom"
    },
    "jobType": {
      "title": "Job",
      "value": "Just one thing — painting, flooring, plastering"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    "extras": {
      "title": "Extras",
      "value": "Plastering"
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
      "key": "room",
      "title": "Room",
      "value": "Bedroom"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Just one thing — painting, flooring, plastering"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": "Plastering"
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
  "unit": "item",
  "alternatives": [
    {
      "material": "bedroom",
      "materialLabel": "Bedroom",
      "heightKey": "full-renovation",
      "label": "Bedroom for the full renovation",
      "heightKeyLabel": "The full renovation",
      "businessId": "reno-1",
      "businessName": "Berwick Home Renovations",
      "estimatedTotal": 3000,
      "value": "alt:bedroom:full-renovation"
    },
    {
      "material": "laundry",
      "materialLabel": "Laundry",
      "heightKey": "demolition-only",
      "label": "Laundry for just strip it out",
      "heightKeyLabel": "Just strip it out",
      "businessId": "reno-1",
      "businessName": "Berwick Home Renovations",
      "estimatedTotal": 900,
      "value": "alt:laundry:demolition-only"
    },
    {
      "material": "bathroom",
      "materialLabel": "Bathroom",
      "heightKey": "demolition-only",
      "label": "Bathroom for just strip it out",
      "heightKeyLabel": "Just strip it out",
      "businessId": "reno-1",
      "businessName": "Berwick Home Renovations",
      "estimatedTotal": 1600,
      "value": "alt:bathroom:demolition-only"
    }
  ]
}
```
