# 61 renovation, a kitchen with the renovator supplying everything

Guards: THE distinction this trade’s own document calls fundamental. The same room is the labour figure or that plus every material in it, and nothing in the number says which - so the cabinetry package has to enter the total here and must NOT in conversation 60. Two extras priced per job come in with it; the waterproofing does not, because nobody asked for it

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

customer: "kitchen"

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
    "room": "kitchen",
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
      "value": "Kitchen"
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
      "value": "Kitchen"
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

customer: "full_renovation"

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
    "room": "kitchen",
    "jobType": "full_renovation",
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
      "value": "Kitchen"
    },
    "jobType": {
      "title": "Job",
      "value": "The full renovation"
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
      "value": "Kitchen"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "The full renovation"
    }
  ],
  "checklistPending": [
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

## turn 6

customer: "supply_and_install"

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
  "message": "Is there an old one to strip out?",
  "options": [
    {
      "label": "Yes, strip it out",
      "value": "any"
    },
    {
      "label": "A small room",
      "value": "small_room"
    },
    {
      "label": "Nothing to strip out",
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
    "room": "kitchen",
    "jobType": "full_renovation",
    "supply": "supply_and_install",
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
        "removal": 0
      },
      "lastAsked": "removal",
      "lastQuestion": "Is there an old one to strip out?",
      "lastValues": [
        "any",
        "small_room",
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
      "value": "Kitchen"
    },
    "jobType": {
      "title": "Job",
      "value": "The full renovation"
    },
    "supply": {
      "title": "Who supplies",
      "value": "Supply the materials and do the work"
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
      "value": "Kitchen"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "The full renovation"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "Supply the materials and do the work"
    }
  ],
  "checklistPending": [
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

## turn 7

customer: "kitchen_strip"

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
    "room": "kitchen",
    "jobType": "full_renovation",
    "supply": "supply_and_install",
    "removal": "kitchen_strip",
    "extras": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 7,
      "cursor": {
        "room": 0,
        "jobType": 0,
        "supply": 0,
        "removal": 0,
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
          "you": "kitchen_strip",
          "me": "Anything else in the job?"
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
      "value": "Kitchen"
    },
    "jobType": {
      "title": "Job",
      "value": "The full renovation"
    },
    "supply": {
      "title": "Who supplies",
      "value": "Supply the materials and do the work"
    },
    "removal": {
      "title": "Strip-out",
      "value": "An old kitchen"
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
      "value": "Kitchen"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "The full renovation"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "Supply the materials and do the work"
    },
    {
      "key": "removal",
      "title": "Strip-out",
      "value": "An old kitchen"
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

## turn 8

customer: "benchtop"

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
    "room": "kitchen",
    "jobType": "full_renovation",
    "supply": "supply_and_install",
    "removal": "kitchen_strip",
    "extras": [
      "benchtop"
    ],
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 8,
      "cursor": {
        "room": 0,
        "jobType": 0,
        "supply": 0,
        "removal": 0,
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
          "you": "kitchen_strip",
          "me": "Anything else in the job?"
        },
        {
          "you": "benchtop",
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
      "value": "Kitchen"
    },
    "jobType": {
      "title": "Job",
      "value": "The full renovation"
    },
    "supply": {
      "title": "Who supplies",
      "value": "Supply the materials and do the work"
    },
    "removal": {
      "title": "Strip-out",
      "value": "An old kitchen"
    },
    "extras": {
      "title": "Extras",
      "value": "A benchtop"
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
      "value": "Kitchen"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "The full renovation"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "Supply the materials and do the work"
    },
    {
      "key": "removal",
      "title": "Strip-out",
      "value": "An old kitchen"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": "A benchtop"
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

## turn 9

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
  "message": "Got it — Berwick, VIC 3806, Kitchen, The full renovation, Supply the materials and do the work, stripping out an old kitchen, a benchtop. All correct?",
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
    "room": "kitchen",
    "jobType": "full_renovation",
    "supply": "supply_and_install",
    "removal": "kitchen_strip",
    "extras": [
      "benchtop"
    ],
    "conditions": [],
    "existingPrice": null,
    "_ui": {
      "turn": 9,
      "cursor": {
        "room": 0,
        "jobType": 0,
        "supply": 0,
        "removal": 0,
        "extras": 0,
        "conditions": 0
      },
      "lastAsked": null,
      "lastQuestion": "Got it — Berwick, VIC 3806, Kitchen, The full renovation, Supply the materials and do the work, stripping out an old kitchen, a benchtop. All correct?",
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
          "you": "kitchen_strip",
          "me": "Anything else in the job?"
        },
        {
          "you": "benchtop",
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
      "value": "Kitchen"
    },
    "jobType": {
      "title": "Job",
      "value": "The full renovation"
    },
    "supply": {
      "title": "Who supplies",
      "value": "Supply the materials and do the work"
    },
    "removal": {
      "title": "Strip-out",
      "value": "An old kitchen"
    },
    "extras": {
      "title": "Extras",
      "value": "A benchtop"
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
      "value": "Kitchen"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "The full renovation"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "Supply the materials and do the work"
    },
    {
      "key": "removal",
      "title": "Strip-out",
      "value": "An old kitchen"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": "A benchtop"
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

## turn 10

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
  "type": "result",
  "message": "Here are the local businesses that cover your job.",
  "options": [],
  "results": [
    {
      "businessId": "reno-1",
      "autoAcceptsAi": true,
      "businessName": "Berwick Home Renovations",
      "suburb": "Berwick, VIC 3806",
      "ratePerMeter": 16850,
      "estimatedTotal": 16850,
      "notes": "incl. GST · In your suburb · 4.8★ (64) · Materials supplied · Old one stripped out · 1 extra included · Carpentry charged by the hour on site, not in this price · Includes $150 site inspection"
    }
  ],
  "avgRatePerMeter": 16850,
  "unit": "item",
  "comparison": {
    "potentialSavings": null,
    "marketAverage": 16850,
    "totalQuotesScreened": 1,
    "userExistingPrice": null,
    "quotes": [
      {
        "businessId": "reno-1",
        "autoAcceptsAi": true,
        "businessName": "Berwick Home Renovations",
        "ratePerMeter": 16850,
        "projectTotalMin": 16850,
        "projectTotalMax": 16850,
        "badges": [
          "incl. GST",
          "In your suburb",
          "4.8★ (64)",
          "Materials supplied",
          "Old one stripped out",
          "1 extra included",
          "Carpentry charged by the hour on site, not in this price",
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
    "room": "kitchen",
    "jobType": "full_renovation",
    "supply": "supply_and_install",
    "removal": "kitchen_strip",
    "extras": [
      "benchtop"
    ],
    "conditions": [],
    "existingPrice": null,
    "_ui": {
      "turn": 10,
      "cursor": {
        "room": 0,
        "jobType": 0,
        "supply": 0,
        "removal": 0,
        "extras": 0,
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
          "you": "kitchen_strip",
          "me": "Anything else in the job?"
        },
        {
          "you": "benchtop",
          "me": "Anything tricky we should know about?"
        }
      ],
      "trade": "home_renovation"
    }
  },
  "checklistComplete": true,
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "room": {
      "title": "Room",
      "value": "Kitchen"
    },
    "jobType": {
      "title": "Job",
      "value": "The full renovation"
    },
    "supply": {
      "title": "Who supplies",
      "value": "Supply the materials and do the work"
    },
    "removal": {
      "title": "Strip-out",
      "value": "An old kitchen"
    },
    "extras": {
      "title": "Extras",
      "value": "A benchtop"
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
      "value": "Kitchen"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "The full renovation"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "Supply the materials and do the work"
    },
    {
      "key": "removal",
      "title": "Strip-out",
      "value": "An old kitchen"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": "A benchtop"
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
