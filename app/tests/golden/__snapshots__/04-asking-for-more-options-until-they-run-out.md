# 04 asking for more options until they run out

Guards: cursor paging and the exhausted wrap-around

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
  "checklistPending": [
    {
      "key": "suburb",
      "title": "Suburb"
    },
    {
      "key": "material",
      "title": "Material"
    },
    {
      "key": "heightKey",
      "title": "Height"
    },
    {
      "key": "lengthMeters",
      "title": "Length"
    },
    {
      "key": "removal",
      "title": "Old fence"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    },
    {
      "key": "gateType",
      "title": "Gate"
    },
    {
      "key": "gateQty",
      "title": "Number of gates"
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
  "checklistPending": [
    {
      "key": "suburb",
      "title": "Suburb"
    },
    {
      "key": "material",
      "title": "Material"
    },
    {
      "key": "heightKey",
      "title": "Height"
    },
    {
      "key": "lengthMeters",
      "title": "Length"
    },
    {
      "key": "removal",
      "title": "Old fence"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    },
    {
      "key": "gateType",
      "title": "Gate"
    },
    {
      "key": "gateQty",
      "title": "Number of gates"
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
  "checklistPending": [
    {
      "key": "material",
      "title": "Material"
    },
    {
      "key": "heightKey",
      "title": "Height"
    },
    {
      "key": "lengthMeters",
      "title": "Length"
    },
    {
      "key": "removal",
      "title": "Old fence"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    },
    {
      "key": "gateType",
      "title": "Gate"
    },
    {
      "key": "gateQty",
      "title": "Number of gates"
    }
  ],
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 4

customer: "something else"

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
      "label": "Aluminium",
      "value": "aluminium"
    },
    {
      "label": "Pool fencing — aluminium",
      "value": "pool_aluminium"
    },
    {
      "label": "Pool fencing — glass",
      "value": "pool_glass"
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
      "turn": 4,
      "cursor": {
        "material": 3
      },
      "lastAsked": "material",
      "lastQuestion": "What type of fence are you after?",
      "lastValues": [
        "aluminium",
        "pool_aluminium",
        "pool_glass",
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
  "checklistPending": [
    {
      "key": "material",
      "title": "Material"
    },
    {
      "key": "heightKey",
      "title": "Height"
    },
    {
      "key": "lengthMeters",
      "title": "Length"
    },
    {
      "key": "removal",
      "title": "Old fence"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    },
    {
      "key": "gateType",
      "title": "Gate"
    },
    {
      "key": "gateQty",
      "title": "Number of gates"
    }
  ],
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 5

customer: "something else"

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
      "label": "Chainmesh",
      "value": "chainmesh"
    },
    {
      "label": "Rural wire",
      "value": "rural_wire"
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
      "turn": 5,
      "cursor": {
        "material": 6
      },
      "lastAsked": "material",
      "lastQuestion": "What type of fence are you after?",
      "lastValues": [
        "chainmesh",
        "rural_wire",
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
  "checklistPending": [
    {
      "key": "material",
      "title": "Material"
    },
    {
      "key": "heightKey",
      "title": "Height"
    },
    {
      "key": "lengthMeters",
      "title": "Length"
    },
    {
      "key": "removal",
      "title": "Old fence"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    },
    {
      "key": "gateType",
      "title": "Gate"
    },
    {
      "key": "gateQty",
      "title": "Number of gates"
    }
  ],
  "results": [],
  "avgRatePerMeter": null
}
```

## turn 6

customer: "something else"

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
  "message": "That's everything we cover — what type of fence are you after?",
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
      "turn": 6,
      "cursor": {
        "material": 0
      },
      "lastAsked": "material",
      "lastQuestion": "That's everything we cover — what type of fence are you after?",
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
  "checklistPending": [
    {
      "key": "material",
      "title": "Material"
    },
    {
      "key": "heightKey",
      "title": "Height"
    },
    {
      "key": "lengthMeters",
      "title": "Length"
    },
    {
      "key": "removal",
      "title": "Old fence"
    },
    {
      "key": "conditions",
      "title": "Site conditions"
    },
    {
      "key": "gateType",
      "title": "Gate"
    },
    {
      "key": "gateQty",
      "title": "Number of gates"
    }
  ],
  "results": [],
  "avgRatePerMeter": null
}
```
