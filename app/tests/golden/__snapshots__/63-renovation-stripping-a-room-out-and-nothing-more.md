# 63 renovation, stripping a room out and nothing more

Guards: the second job type against a room the renovator also renovates, reached through optionsKeyedBy - and the double-charge guard. "Bathroom demolition $1,450" is ONE price on the list stored as both a demolition_only rate and a removal, so a customer who wants only the strip-out must be charged $1,450 and never $2,900. The strip-out question is not even asked here, because the strip-out IS the job

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

customer: "bathroom"

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
    "room": "bathroom",
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
      "key": "room",
      "title": "Room",
      "value": "Bathroom"
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

customer: "demolition_only"

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
    "room": "bathroom",
    "jobType": "demolition_only",
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
      "value": "Bathroom"
    },
    "jobType": {
      "title": "Job",
      "value": "Just strip it out"
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
      "value": "Bathroom"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Just strip it out"
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
    "room": "bathroom",
    "jobType": "demolition_only",
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
      "value": "Bathroom"
    },
    "jobType": {
      "title": "Job",
      "value": "Just strip it out"
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
      "value": "Bathroom"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Just strip it out"
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
    "room": "bathroom",
    "jobType": "demolition_only",
    "supply": "labour_only",
    "removal": null,
    "extras": [],
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
      "value": "Bathroom"
    },
    "jobType": {
      "title": "Job",
      "value": "Just strip it out"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the materials"
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
      "key": "room",
      "title": "Room",
      "value": "Bathroom"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Just strip it out"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": ""
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
  "message": "Got it — Berwick, VIC 3806, Bathroom, Just strip it out, I'm supplying the materials. All correct?",
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
    "room": "bathroom",
    "jobType": "demolition_only",
    "supply": "labour_only",
    "removal": null,
    "extras": [],
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
      "lastQuestion": "Got it — Berwick, VIC 3806, Bathroom, Just strip it out, I'm supplying the materials. All correct?",
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
      "value": "Bathroom"
    },
    "jobType": {
      "title": "Job",
      "value": "Just strip it out"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    "extras": {
      "title": "Extras",
      "value": ""
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
      "value": "Bathroom"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Just strip it out"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": ""
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
  "type": "result",
  "message": "Here are the local businesses that cover your job.",
  "options": [],
  "results": [
    {
      "businessId": "reno-1",
      "autoAcceptsAi": true,
      "businessName": "Berwick Home Renovations",
      "suburb": "Berwick, VIC 3806",
      "ratePerMeter": 1600,
      "estimatedTotal": 1600,
      "notes": "incl. GST · In your suburb · 4.8★ (64) · You supply the materials · Carpentry charged by the hour on site, not in this price · Includes $150 site inspection"
    }
  ],
  "avgRatePerMeter": 1600,
  "unit": "item",
  "comparison": {
    "potentialSavings": null,
    "marketAverage": 1600,
    "totalQuotesScreened": 1,
    "userExistingPrice": null,
    "quotes": [
      {
        "businessId": "reno-1",
        "autoAcceptsAi": true,
        "businessName": "Berwick Home Renovations",
        "ratePerMeter": 1600,
        "projectTotalMin": 1600,
        "projectTotalMax": 1600,
        "badges": [
          "incl. GST",
          "In your suburb",
          "4.8★ (64)",
          "You supply the materials",
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
    "room": "bathroom",
    "jobType": "demolition_only",
    "supply": "labour_only",
    "removal": null,
    "extras": [],
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
      "value": "Bathroom"
    },
    "jobType": {
      "title": "Job",
      "value": "Just strip it out"
    },
    "supply": {
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    "extras": {
      "title": "Extras",
      "value": ""
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
      "value": "Bathroom"
    },
    {
      "key": "jobType",
      "title": "Job",
      "value": "Just strip it out"
    },
    {
      "key": "supply",
      "title": "Who supplies",
      "value": "I'm supplying the materials"
    },
    {
      "key": "extras",
      "title": "Extras",
      "value": ""
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
