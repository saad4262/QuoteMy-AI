# 62 renovation, asking for work that is only sold by the square metre and by the hour

Guards: THE quote this trade exists to get right, and the one thing its pricing module is for. Floor tiling is $75 per square metre and carpentry is $95 an hour - both real, both published, both asked for - and neither may enter the total, because this conversation asks for no area and no hours. They must appear as badges saying so instead. A total containing 75 or 95 is this trade’s worst failure: it shows a customer a number far below what they will actually be charged

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
    "room": "bedroom",
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
      "value": "Bedroom"
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
    "room": "bedroom",
    "jobType": "full_renovation",
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
    },
    "jobType": {
      "title": "Job",
      "value": "The full renovation"
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
      "value": "The full renovation"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the materials"
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
    "jobType": "full_renovation",
    "supply": "labour_only",
    "removal": "none",
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
    },
    "jobType": {
      "title": "Job",
      "value": "The full renovation"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    "removal": {
      "title": "Strip-out",
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
      "key": "room",
      "title": "Room",
      "value": "Bedroom"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "The full renovation"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    {
      "key": "removal",
      "title": "Strip-out",
      "value": "Nothing to remove"
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

customer: "tiling"

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
    "jobType": "full_renovation",
    "supply": "labour_only",
    "removal": "none",
    "extras": [
      "tiling"
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
    },
    "jobType": {
      "title": "Job",
      "value": "The full renovation"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    "removal": {
      "title": "Strip-out",
      "value": "Nothing to remove"
    },
    "extras": {
      "title": "Extras",
      "value": "Tiling"
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
      "value": "The full renovation"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    {
      "key": "removal",
      "title": "Strip-out",
      "value": "Nothing to remove"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": "Tiling"
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
  "message": "Got it — Berwick, VIC 3806, Bedroom, The full renovation, I'm supplying the materials, tiling. All correct?",
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
    "jobType": "full_renovation",
    "supply": "labour_only",
    "removal": "none",
    "extras": [
      "tiling"
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
      "lastQuestion": "Got it — Berwick, VIC 3806, Bedroom, The full renovation, I'm supplying the materials, tiling. All correct?",
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
      "value": "The full renovation"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    "removal": {
      "title": "Strip-out",
      "value": "Nothing to remove"
    },
    "extras": {
      "title": "Extras",
      "value": "Tiling"
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
      "value": "The full renovation"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    {
      "key": "removal",
      "title": "Strip-out",
      "value": "Nothing to remove"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": "Tiling"
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
      "ratePerMeter": 3000,
      "estimatedTotal": 3000,
      "notes": "incl. GST · In your suburb · 4.8★ (64) · You supply the materials · Floor tiling measured on site, not in this price · Carpentry charged by the hour on site, not in this price · Includes $150 site inspection"
    }
  ],
  "avgRatePerMeter": 3000,
  "unit": "item",
  "comparison": {
    "potentialSavings": null,
    "marketAverage": 3000,
    "totalQuotesScreened": 1,
    "userExistingPrice": null,
    "quotes": [
      {
        "businessId": "reno-1",
        "autoAcceptsAi": true,
        "businessName": "Berwick Home Renovations",
        "ratePerMeter": 3000,
        "projectTotalMin": 3000,
        "projectTotalMax": 3000,
        "badges": [
          "incl. GST",
          "In your suburb",
          "4.8★ (64)",
          "You supply the materials",
          "Floor tiling measured on site, not in this price",
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
    "room": "bedroom",
    "jobType": "full_renovation",
    "supply": "labour_only",
    "removal": "none",
    "extras": [
      "tiling"
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
          "you": "bedroom",
          "me": "What do you need done to it?"
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
      "value": "Bedroom"
    },
    "jobType": {
      "title": "Job",
      "value": "The full renovation"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    "removal": {
      "title": "Strip-out",
      "value": "Nothing to remove"
    },
    "extras": {
      "title": "Extras",
      "value": "Tiling"
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
      "value": "The full renovation"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    {
      "key": "removal",
      "title": "Strip-out",
      "value": "Nothing to remove"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": "Tiling"
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
