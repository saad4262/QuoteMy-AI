# 08 a real gate, so the quantity IS asked

Guards: the dependsOn rule in the direction that breaks loudly if it is inverted

## turn 1

customer: "I need a fence quote"

```json
{
  "sessionId": "golden",
  "trade": "fencing",
  "intent": "new_quote",
  "place": null,
  "type": "message",
  "message": "Happy to help with that. Mind if I ask a few quick questions?",
  "options": [],
  "checklistComplete": false,
  "checklist": {
    "suburb": null,
    "material": null,
    "heightKey": null,
    "lengthMeters": null,
    "removal": null,
    "conditions": null,
    "gateType": null,
    "gateQty": null,
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
      "place": null
    }
  },
  "checklistDisplay": {},
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 2

customer: "yes go ahead"

```json
{
  "sessionId": "golden",
  "trade": "fencing",
  "intent": "new_quote",
  "place": null,
  "type": "message",
  "message": "Which suburb is the fence going in? A postcode works too.",
  "options": [],
  "expects": "suburb",
  "checklistComplete": false,
  "checklist": {
    "suburb": null,
    "material": null,
    "heightKey": null,
    "lengthMeters": null,
    "removal": null,
    "conditions": null,
    "gateType": null,
    "gateQty": null,
    "existingPrice": null,
    "_ui": {
      "turn": 2,
      "cursor": {},
      "lastAsked": "suburb",
      "lastQuestion": "Which suburb is the fence going in? A postcode works too.",
      "lastValues": [],
      "lastType": "message",
      "fixing": false,
      "rejectedPlaces": [],
      "nearbyPlaces": {},
      "suburbHint": null,
      "place": null
    }
  },
  "checklistDisplay": {},
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
  "trade": "fencing",
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
  "message": "What type of fence are you after?",
  "options": [
    {
      "label": "Treated pine",
      "value": "timber_pine"
    },
    {
      "label": "Hardwood timber",
      "value": "timber_hardwood"
    },
    {
      "label": "Colorbond",
      "value": "colorbond"
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "material": null,
    "heightKey": null,
    "lengthMeters": null,
    "removal": null,
    "conditions": null,
    "gateType": null,
    "gateQty": null,
    "existingPrice": null,
    "_ui": {
      "turn": 3,
      "cursor": {
        "material": 0
      },
      "lastAsked": "material",
      "lastQuestion": "What type of fence are you after?",
      "lastValues": [
        "timber_pine",
        "timber_hardwood",
        "colorbond",
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
      }
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    }
  },
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 4

customer: "colorbond"

```json
{
  "sessionId": "golden",
  "trade": "fencing",
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
  "message": "What height are you after?",
  "options": [
    {
      "label": "1.2m",
      "value": "1.2m"
    },
    {
      "label": "1.5m",
      "value": "1.5m"
    },
    {
      "label": "1.8m",
      "value": "1.8m"
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "material": "colorbond",
    "heightKey": null,
    "lengthMeters": null,
    "removal": null,
    "conditions": null,
    "gateType": null,
    "gateQty": null,
    "existingPrice": null,
    "_ui": {
      "turn": 4,
      "cursor": {
        "material": 0,
        "heightKey": 0
      },
      "lastAsked": "heightKey",
      "lastQuestion": "What height are you after?",
      "lastValues": [
        "1.2m",
        "1.5m",
        "1.8m",
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
      }
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "material": {
      "title": "Material",
      "value": "Colorbond"
    }
  },
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 5

customer: "1.8m"

```json
{
  "sessionId": "golden",
  "trade": "fencing",
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
  "message": "How long is the fence?",
  "options": [
    {
      "label": "10m",
      "value": 10
    },
    {
      "label": "15m",
      "value": 15
    },
    {
      "label": "20m",
      "value": 20
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "material": "colorbond",
    "heightKey": "1.8m",
    "lengthMeters": null,
    "removal": null,
    "conditions": null,
    "gateType": null,
    "gateQty": null,
    "existingPrice": null,
    "_ui": {
      "turn": 5,
      "cursor": {
        "material": 0,
        "heightKey": 0,
        "lengthMeters": 0
      },
      "lastAsked": "lengthMeters",
      "lastQuestion": "How long is the fence?",
      "lastValues": [
        10,
        15,
        20,
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
      }
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "material": {
      "title": "Material",
      "value": "Colorbond"
    },
    "heightKey": {
      "title": "Height",
      "value": "1.8m"
    }
  },
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 6

customer: "20"

```json
{
  "sessionId": "golden",
  "trade": "fencing",
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
  "message": "Is there an old fence to remove?",
  "options": [
    {
      "label": "Timber fence",
      "value": "timber"
    },
    {
      "label": "Metal fence",
      "value": "metal"
    },
    {
      "label": "Nothing to remove",
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
    "material": "colorbond",
    "heightKey": "1.8m",
    "lengthMeters": 20,
    "removal": null,
    "conditions": null,
    "gateType": null,
    "gateQty": null,
    "existingPrice": null,
    "_ui": {
      "turn": 6,
      "cursor": {
        "material": 0,
        "heightKey": 0,
        "lengthMeters": 0,
        "removal": 0
      },
      "lastAsked": "removal",
      "lastQuestion": "Is there an old fence to remove?",
      "lastValues": [
        "timber",
        "metal",
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
      }
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "material": {
      "title": "Material",
      "value": "Colorbond"
    },
    "heightKey": {
      "title": "Height",
      "value": "1.8m"
    },
    "lengthMeters": {
      "title": "Length",
      "value": "20m"
    }
  },
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 7

customer: "none"

```json
{
  "sessionId": "golden",
  "trade": "fencing",
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
      "label": "Sloped block",
      "value": "sloped"
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
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "material": "colorbond",
    "heightKey": "1.8m",
    "lengthMeters": 20,
    "removal": "none",
    "conditions": null,
    "gateType": null,
    "gateQty": null,
    "existingPrice": null,
    "_ui": {
      "turn": 7,
      "cursor": {
        "material": 0,
        "heightKey": 0,
        "lengthMeters": 0,
        "removal": 0,
        "conditions": 0
      },
      "lastAsked": "conditions",
      "lastQuestion": "Anything tricky about the site?",
      "lastValues": [
        "sloped",
        "rock",
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
      }
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "material": {
      "title": "Material",
      "value": "Colorbond"
    },
    "heightKey": {
      "title": "Height",
      "value": "1.8m"
    },
    "lengthMeters": {
      "title": "Length",
      "value": "20m"
    },
    "removal": {
      "title": "Old fence",
      "value": "Nothing to remove"
    }
  },
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 8

customer: "none"

```json
{
  "sessionId": "golden",
  "trade": "fencing",
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
  "message": "Do you need any gates?",
  "options": [
    {
      "label": "Single pedestrian gate",
      "value": "pedestrian_single"
    },
    {
      "label": "Double driveway gate",
      "value": "driveway_double"
    },
    {
      "label": "No gates",
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
    "material": "colorbond",
    "heightKey": "1.8m",
    "lengthMeters": 20,
    "removal": "none",
    "conditions": [],
    "gateType": null,
    "gateQty": null,
    "existingPrice": null,
    "_ui": {
      "turn": 8,
      "cursor": {
        "material": 0,
        "heightKey": 0,
        "lengthMeters": 0,
        "removal": 0,
        "conditions": 0,
        "gateType": 0
      },
      "lastAsked": "gateType",
      "lastQuestion": "Do you need any gates?",
      "lastValues": [
        "pedestrian_single",
        "driveway_double",
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
      }
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "material": {
      "title": "Material",
      "value": "Colorbond"
    },
    "heightKey": {
      "title": "Height",
      "value": "1.8m"
    },
    "lengthMeters": {
      "title": "Length",
      "value": "20m"
    },
    "removal": {
      "title": "Old fence",
      "value": "Nothing to remove"
    },
    "conditions": {
      "title": "Site conditions",
      "value": "Nothing tricky"
    }
  },
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 9

customer: "pedestrian_single"

```json
{
  "sessionId": "golden",
  "trade": "fencing",
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
  "message": "How many of those gates?",
  "options": [
    {
      "label": "1 gate",
      "value": 1
    },
    {
      "label": "2 gates",
      "value": 2
    },
    {
      "label": "3 gates",
      "value": 3
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "material": "colorbond",
    "heightKey": "1.8m",
    "lengthMeters": 20,
    "removal": "none",
    "conditions": [],
    "gateType": "pedestrian_single",
    "gateQty": null,
    "existingPrice": null,
    "_ui": {
      "turn": 9,
      "cursor": {
        "material": 0,
        "heightKey": 0,
        "lengthMeters": 0,
        "removal": 0,
        "conditions": 0,
        "gateType": 0,
        "gateQty": 0
      },
      "lastAsked": "gateQty",
      "lastQuestion": "How many of those gates?",
      "lastValues": [
        1,
        2,
        3,
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
      }
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "material": {
      "title": "Material",
      "value": "Colorbond"
    },
    "heightKey": {
      "title": "Height",
      "value": "1.8m"
    },
    "lengthMeters": {
      "title": "Length",
      "value": "20m"
    },
    "removal": {
      "title": "Old fence",
      "value": "Nothing to remove"
    },
    "conditions": {
      "title": "Site conditions",
      "value": "Nothing tricky"
    },
    "gateType": {
      "title": "Gate",
      "value": "Single pedestrian gate"
    }
  },
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 10

customer: "2"

```json
{
  "sessionId": "golden",
  "trade": "fencing",
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
  "message": "Got it — Berwick, VIC 3806, Colorbond, 1.8m, 20m, 2 x single pedestrian gate. All correct?",
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
    "material": "colorbond",
    "heightKey": "1.8m",
    "lengthMeters": 20,
    "removal": "none",
    "conditions": [],
    "gateType": "pedestrian_single",
    "gateQty": 2,
    "existingPrice": null,
    "_ui": {
      "turn": 10,
      "cursor": {
        "material": 0,
        "heightKey": 0,
        "lengthMeters": 0,
        "removal": 0,
        "conditions": 0,
        "gateType": 0,
        "gateQty": 0
      },
      "lastAsked": null,
      "lastQuestion": "Got it — Berwick, VIC 3806, Colorbond, 1.8m, 20m, 2 x single pedestrian gate. All correct?",
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
      }
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "material": {
      "title": "Material",
      "value": "Colorbond"
    },
    "heightKey": {
      "title": "Height",
      "value": "1.8m"
    },
    "lengthMeters": {
      "title": "Length",
      "value": "20m"
    },
    "removal": {
      "title": "Old fence",
      "value": "Nothing to remove"
    },
    "conditions": {
      "title": "Site conditions",
      "value": "Nothing tricky"
    },
    "gateType": {
      "title": "Gate",
      "value": "Single pedestrian gate"
    },
    "gateQty": {
      "title": "Gates",
      "value": "2 gates"
    }
  },
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 11

customer: "yes"

```json
{
  "sessionId": "golden",
  "trade": "fencing",
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
      "businessId": "biz-4",
      "autoAcceptsAi": true,
      "businessName": "Gates Included",
      "suburb": "Berwick, VIC 3806",
      "ratePerMeter": 110,
      "estimatedTotal": 3400,
      "notes": "incl. GST · In your suburb · 4.8★ (120) · 2 gates included"
    }
  ],
  "avgRatePerMeter": 110,
  "comparison": {
    "potentialSavings": null,
    "marketAverage": 3400,
    "totalQuotesScreened": 1,
    "userExistingPrice": null,
    "quotes": [
      {
        "businessId": "biz-4",
        "autoAcceptsAi": true,
        "businessName": "Gates Included",
        "ratePerMeter": 110,
        "projectTotalMin": 3400,
        "projectTotalMax": 3400,
        "badges": [
          "incl. GST",
          "In your suburb",
          "4.8★ (120)",
          "2 gates included"
        ],
        "warranty": null,
        "tag": "BEST_VALUE",
        "savingsFromAverage": null,
        "suburb": "Berwick, VIC 3806"
      }
    ]
  },
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "material": "colorbond",
    "heightKey": "1.8m",
    "lengthMeters": 20,
    "removal": "none",
    "conditions": [],
    "gateType": "pedestrian_single",
    "gateQty": 2,
    "existingPrice": null,
    "_ui": {
      "turn": 11,
      "cursor": {
        "material": 0,
        "heightKey": 0,
        "lengthMeters": 0,
        "removal": 0,
        "conditions": 0,
        "gateType": 0,
        "gateQty": 0
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
      }
    }
  },
  "checklistComplete": true,
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "material": {
      "title": "Material",
      "value": "Colorbond"
    },
    "heightKey": {
      "title": "Height",
      "value": "1.8m"
    },
    "lengthMeters": {
      "title": "Length",
      "value": "20m"
    },
    "removal": {
      "title": "Old fence",
      "value": "Nothing to remove"
    },
    "conditions": {
      "title": "Site conditions",
      "value": "Nothing tricky"
    },
    "gateType": {
      "title": "Gate",
      "value": "Single pedestrian gate"
    },
    "gateQty": {
      "title": "Gates",
      "value": "2 gates"
    }
  }
}
```
