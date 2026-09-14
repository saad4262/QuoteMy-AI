# 51 decking, an elevated deck with a balustrade and stairs

Guards: THE quote this trade exists to get right - three different quantities in one total: 25m2 of deck, 12 LINEAR metres of balustrade along its edge, and one stair flight. A balustrade multiplied by the deck area instead of its length would be out by more than double

## turn 1

customer: "I need a decking quote"

```json
{
  "sessionId": "golden",
  "trade": "decking",
  "intent": "new_quote",
  "place": null,
  "type": "message",
  "message": "Happy to help with that. Mind if I ask a few quick questions?",
  "options": [],
  "checklistComplete": false,
  "checklist": {
    "suburb": null,
    "deckHeight": null,
    "material": null,
    "areaSqm": null,
    "attachment": null,
    "removal": null,
    "balustrade": null,
    "balustradeLm": null,
    "stairs": null,
    "stairFlights": null,
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
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        }
      ],
      "trade": "decking"
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
      "key": "deckHeight",
      "title": "Height"
    },
    {
      "key": "material",
      "title": "Decking"
    },
    {
      "key": "areaSqm",
      "title": "Size"
    },
    {
      "key": "attachment",
      "title": "Attachment"
    },
    {
      "key": "removal",
      "title": "Old deck"
    },
    {
      "key": "balustrade",
      "title": "Balustrade"
    },
    {
      "key": "balustradeLm",
      "title": "Balustrade length"
    },
    {
      "key": "stairs",
      "title": "Stairs"
    },
    {
      "key": "stairFlights",
      "title": "Flights"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m2"
}
```

## turn 2

customer: "yes go ahead"

```json
{
  "sessionId": "golden",
  "trade": "decking",
  "intent": "new_quote",
  "place": null,
  "type": "message",
  "message": "Which suburb is the deck going in? A postcode works too.",
  "options": [],
  "expects": "suburb",
  "checklistComplete": false,
  "checklist": {
    "suburb": null,
    "deckHeight": null,
    "material": null,
    "areaSqm": null,
    "attachment": null,
    "removal": null,
    "balustrade": null,
    "balustradeLm": null,
    "stairs": null,
    "stairFlights": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 2,
      "cursor": {},
      "lastAsked": "suburb",
      "lastQuestion": "Which suburb is the deck going in? A postcode works too.",
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
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the deck going in? A postcode works too."
        }
      ],
      "trade": "decking"
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
      "key": "deckHeight",
      "title": "Height"
    },
    {
      "key": "material",
      "title": "Decking"
    },
    {
      "key": "areaSqm",
      "title": "Size"
    },
    {
      "key": "attachment",
      "title": "Attachment"
    },
    {
      "key": "removal",
      "title": "Old deck"
    },
    {
      "key": "balustrade",
      "title": "Balustrade"
    },
    {
      "key": "balustradeLm",
      "title": "Balustrade length"
    },
    {
      "key": "stairs",
      "title": "Stairs"
    },
    {
      "key": "stairFlights",
      "title": "Flights"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m2"
}
```

## turn 3

customer: "Berwick"
picked place: Berwick, VIC 3806

```json
{
  "sessionId": "golden",
  "trade": "decking",
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
  "message": "How far off the ground will the deck sit?",
  "options": [
    {
      "label": "On the ground — step straight out",
      "value": "ground_level"
    },
    {
      "label": "A step or two up",
      "value": "low_level"
    },
    {
      "label": "Up high — needs stairs",
      "value": "elevated"
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
    "deckHeight": null,
    "material": null,
    "areaSqm": null,
    "attachment": null,
    "removal": null,
    "balustrade": null,
    "balustradeLm": null,
    "stairs": null,
    "stairFlights": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 3,
      "cursor": {
        "deckHeight": 0
      },
      "lastAsked": "deckHeight",
      "lastQuestion": "How far off the ground will the deck sit?",
      "lastValues": [
        "ground_level",
        "low_level",
        "elevated",
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
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the deck going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "How far off the ground will the deck sit?"
        }
      ],
      "trade": "decking"
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
      "key": "deckHeight",
      "title": "Height"
    },
    {
      "key": "material",
      "title": "Decking"
    },
    {
      "key": "areaSqm",
      "title": "Size"
    },
    {
      "key": "attachment",
      "title": "Attachment"
    },
    {
      "key": "removal",
      "title": "Old deck"
    },
    {
      "key": "balustrade",
      "title": "Balustrade"
    },
    {
      "key": "balustradeLm",
      "title": "Balustrade length"
    },
    {
      "key": "stairs",
      "title": "Stairs"
    },
    {
      "key": "stairFlights",
      "title": "Flights"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m2"
}
```

## turn 4

customer: "elevated"

```json
{
  "sessionId": "golden",
  "trade": "decking",
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
  "message": "What decking are you after?",
  "options": [
    {
      "label": "Treated pine",
      "value": "treated_pine"
    },
    {
      "label": "Merbau",
      "value": "merbau"
    },
    {
      "label": "Composite",
      "value": "composite"
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
    "deckHeight": "elevated",
    "material": null,
    "areaSqm": null,
    "attachment": null,
    "removal": null,
    "balustrade": null,
    "balustradeLm": null,
    "stairs": null,
    "stairFlights": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 4,
      "cursor": {
        "deckHeight": 0,
        "material": 0
      },
      "lastAsked": "material",
      "lastQuestion": "What decking are you after?",
      "lastValues": [
        "treated_pine",
        "merbau",
        "composite",
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
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the deck going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "How far off the ground will the deck sit?"
        }
      ],
      "trade": "decking"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "deckHeight": {
      "title": "Height",
      "value": "Up high — needs stairs"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "deckHeight",
      "title": "Height",
      "value": "Up high — needs stairs"
    }
  ],
  "checklistPending": [
    {
      "key": "material",
      "title": "Decking"
    },
    {
      "key": "areaSqm",
      "title": "Size"
    },
    {
      "key": "attachment",
      "title": "Attachment"
    },
    {
      "key": "removal",
      "title": "Old deck"
    },
    {
      "key": "balustrade",
      "title": "Balustrade"
    },
    {
      "key": "balustradeLm",
      "title": "Balustrade length"
    },
    {
      "key": "stairs",
      "title": "Stairs"
    },
    {
      "key": "stairFlights",
      "title": "Flights"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m2"
}
```

## turn 5

customer: "merbau"

```json
{
  "sessionId": "golden",
  "trade": "decking",
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
  "message": "Roughly how big is the deck?",
  "options": [
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "deckHeight": "elevated",
    "material": "merbau",
    "areaSqm": null,
    "attachment": null,
    "removal": null,
    "balustrade": null,
    "balustradeLm": null,
    "stairs": null,
    "stairFlights": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 5,
      "cursor": {
        "deckHeight": 0,
        "material": 0,
        "areaSqm": 0
      },
      "lastAsked": "areaSqm",
      "lastQuestion": "Roughly how big is the deck?",
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
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the deck going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "How far off the ground will the deck sit?"
        }
      ],
      "trade": "decking"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "deckHeight": {
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    "material": {
      "title": "Decking",
      "value": "Merbau"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "deckHeight",
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Merbau"
    }
  ],
  "checklistPending": [
    {
      "key": "areaSqm",
      "title": "Size"
    },
    {
      "key": "attachment",
      "title": "Attachment"
    },
    {
      "key": "removal",
      "title": "Old deck"
    },
    {
      "key": "balustrade",
      "title": "Balustrade"
    },
    {
      "key": "balustradeLm",
      "title": "Balustrade length"
    },
    {
      "key": "stairs",
      "title": "Stairs"
    },
    {
      "key": "stairFlights",
      "title": "Flights"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m2"
}
```

## turn 6

customer: "25"

```json
{
  "sessionId": "golden",
  "trade": "decking",
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
  "message": "Will it be attached to the house, or standing on its own?",
  "options": [
    {
      "label": "Attached to the house",
      "value": "attached"
    },
    {
      "label": "Standing on its own",
      "value": "freestanding"
    },
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "deckHeight": "elevated",
    "material": "merbau",
    "areaSqm": 25,
    "attachment": null,
    "removal": null,
    "balustrade": null,
    "balustradeLm": null,
    "stairs": null,
    "stairFlights": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 6,
      "cursor": {
        "deckHeight": 0,
        "material": 0,
        "areaSqm": 0,
        "attachment": 0
      },
      "lastAsked": "attachment",
      "lastQuestion": "Will it be attached to the house, or standing on its own?",
      "lastValues": [
        "attached",
        "freestanding",
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
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the deck going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "How far off the ground will the deck sit?"
        },
        {
          "you": "25",
          "me": "Will it be attached to the house, or standing on its own?"
        }
      ],
      "trade": "decking"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "deckHeight": {
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    "material": {
      "title": "Decking",
      "value": "Merbau"
    },
    "areaSqm": {
      "title": "Size",
      "value": "25m²"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "deckHeight",
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Merbau"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "25m²"
    }
  ],
  "checklistPending": [
    {
      "key": "attachment",
      "title": "Attachment"
    },
    {
      "key": "removal",
      "title": "Old deck"
    },
    {
      "key": "balustrade",
      "title": "Balustrade"
    },
    {
      "key": "balustradeLm",
      "title": "Balustrade length"
    },
    {
      "key": "stairs",
      "title": "Stairs"
    },
    {
      "key": "stairFlights",
      "title": "Flights"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m2"
}
```

## turn 7

customer: "attached"

```json
{
  "sessionId": "golden",
  "trade": "decking",
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
  "message": "Is there an old deck to take out?",
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
    "deckHeight": "elevated",
    "material": "merbau",
    "areaSqm": 25,
    "attachment": "attached",
    "removal": null,
    "balustrade": null,
    "balustradeLm": null,
    "stairs": null,
    "stairFlights": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 7,
      "cursor": {
        "deckHeight": 0,
        "material": 0,
        "areaSqm": 0,
        "attachment": 0,
        "removal": 0
      },
      "lastAsked": "removal",
      "lastQuestion": "Is there an old deck to take out?",
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
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the deck going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "How far off the ground will the deck sit?"
        },
        {
          "you": "25",
          "me": "Will it be attached to the house, or standing on its own?"
        }
      ],
      "trade": "decking"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "deckHeight": {
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    "material": {
      "title": "Decking",
      "value": "Merbau"
    },
    "areaSqm": {
      "title": "Size",
      "value": "25m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Attached to the house"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "deckHeight",
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Merbau"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "25m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Attached to the house"
    }
  ],
  "checklistPending": [
    {
      "key": "removal",
      "title": "Old deck"
    },
    {
      "key": "balustrade",
      "title": "Balustrade"
    },
    {
      "key": "balustradeLm",
      "title": "Balustrade length"
    },
    {
      "key": "stairs",
      "title": "Stairs"
    },
    {
      "key": "stairFlights",
      "title": "Flights"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m2"
}
```

## turn 8

customer: "timber_deck"

```json
{
  "sessionId": "golden",
  "trade": "decking",
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
  "message": "Do you need a balustrade?",
  "options": [
    {
      "label": "Timber",
      "value": "timber"
    },
    {
      "label": "Aluminium",
      "value": "aluminium"
    },
    {
      "label": "No balustrade",
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
    "deckHeight": "elevated",
    "material": "merbau",
    "areaSqm": 25,
    "attachment": "attached",
    "removal": "timber_deck",
    "balustrade": null,
    "balustradeLm": null,
    "stairs": null,
    "stairFlights": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 8,
      "cursor": {
        "deckHeight": 0,
        "material": 0,
        "areaSqm": 0,
        "attachment": 0,
        "removal": 0,
        "balustrade": 0
      },
      "lastAsked": "balustrade",
      "lastQuestion": "Do you need a balustrade?",
      "lastValues": [
        "timber",
        "aluminium",
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
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the deck going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "How far off the ground will the deck sit?"
        },
        {
          "you": "25",
          "me": "Will it be attached to the house, or standing on its own?"
        },
        {
          "you": "timber_deck",
          "me": "Do you need a balustrade?"
        }
      ],
      "trade": "decking"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "deckHeight": {
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    "material": {
      "title": "Decking",
      "value": "Merbau"
    },
    "areaSqm": {
      "title": "Size",
      "value": "25m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Attached to the house"
    },
    "removal": {
      "title": "Old deck",
      "value": "An old timber deck"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "deckHeight",
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Merbau"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "25m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Attached to the house"
    },
    {
      "key": "removal",
      "title": "Old deck",
      "value": "An old timber deck"
    }
  ],
  "checklistPending": [
    {
      "key": "balustrade",
      "title": "Balustrade"
    },
    {
      "key": "balustradeLm",
      "title": "Balustrade length"
    },
    {
      "key": "stairs",
      "title": "Stairs"
    },
    {
      "key": "stairFlights",
      "title": "Flights"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m2"
}
```

## turn 9

customer: "timber"

```json
{
  "sessionId": "golden",
  "trade": "decking",
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
  "message": "Roughly how many metres of balustrade?",
  "options": [
    {
      "label": "Other",
      "value": "__other__"
    }
  ],
  "checklistComplete": false,
  "checklist": {
    "suburb": "Berwick, VIC 3806",
    "deckHeight": "elevated",
    "material": "merbau",
    "areaSqm": 25,
    "attachment": "attached",
    "removal": "timber_deck",
    "balustrade": "timber",
    "balustradeLm": null,
    "stairs": null,
    "stairFlights": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 9,
      "cursor": {
        "deckHeight": 0,
        "material": 0,
        "areaSqm": 0,
        "attachment": 0,
        "removal": 0,
        "balustrade": 0,
        "balustradeLm": 0
      },
      "lastAsked": "balustradeLm",
      "lastQuestion": "Roughly how many metres of balustrade?",
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
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the deck going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "How far off the ground will the deck sit?"
        },
        {
          "you": "25",
          "me": "Will it be attached to the house, or standing on its own?"
        },
        {
          "you": "timber_deck",
          "me": "Do you need a balustrade?"
        }
      ],
      "trade": "decking"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "deckHeight": {
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    "material": {
      "title": "Decking",
      "value": "Merbau"
    },
    "areaSqm": {
      "title": "Size",
      "value": "25m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Attached to the house"
    },
    "removal": {
      "title": "Old deck",
      "value": "An old timber deck"
    },
    "balustrade": {
      "title": "Balustrade",
      "value": "Timber"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "deckHeight",
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Merbau"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "25m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Attached to the house"
    },
    {
      "key": "removal",
      "title": "Old deck",
      "value": "An old timber deck"
    },
    {
      "key": "balustrade",
      "title": "Balustrade",
      "value": "Timber"
    }
  ],
  "checklistPending": [
    {
      "key": "balustradeLm",
      "title": "Balustrade length"
    },
    {
      "key": "stairs",
      "title": "Stairs"
    },
    {
      "key": "stairFlights",
      "title": "Flights"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m2"
}
```

## turn 10

customer: "12"

```json
{
  "sessionId": "golden",
  "trade": "decking",
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
  "message": "Do you need stairs?",
  "options": [
    {
      "label": "Standard timber stairs",
      "value": "timber"
    },
    {
      "label": "No stairs",
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
    "deckHeight": "elevated",
    "material": "merbau",
    "areaSqm": 25,
    "attachment": "attached",
    "removal": "timber_deck",
    "balustrade": "timber",
    "balustradeLm": 12,
    "stairs": null,
    "stairFlights": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 10,
      "cursor": {
        "deckHeight": 0,
        "material": 0,
        "areaSqm": 0,
        "attachment": 0,
        "removal": 0,
        "balustrade": 0,
        "balustradeLm": 0,
        "stairs": 0
      },
      "lastAsked": "stairs",
      "lastQuestion": "Do you need stairs?",
      "lastValues": [
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
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the deck going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "How far off the ground will the deck sit?"
        },
        {
          "you": "25",
          "me": "Will it be attached to the house, or standing on its own?"
        },
        {
          "you": "timber_deck",
          "me": "Do you need a balustrade?"
        },
        {
          "you": "12",
          "me": "Do you need stairs?"
        }
      ],
      "trade": "decking"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "deckHeight": {
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    "material": {
      "title": "Decking",
      "value": "Merbau"
    },
    "areaSqm": {
      "title": "Size",
      "value": "25m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Attached to the house"
    },
    "removal": {
      "title": "Old deck",
      "value": "An old timber deck"
    },
    "balustrade": {
      "title": "Balustrade",
      "value": "Timber"
    },
    "balustradeLm": {
      "title": "Balustrade length",
      "value": "12m"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "deckHeight",
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Merbau"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "25m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Attached to the house"
    },
    {
      "key": "removal",
      "title": "Old deck",
      "value": "An old timber deck"
    },
    {
      "key": "balustrade",
      "title": "Balustrade",
      "value": "Timber"
    },
    {
      "key": "balustradeLm",
      "title": "Balustrade length",
      "value": "12m"
    }
  ],
  "checklistPending": [
    {
      "key": "stairs",
      "title": "Stairs"
    },
    {
      "key": "stairFlights",
      "title": "Flights"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m2"
}
```

## turn 11

customer: "timber"

```json
{
  "sessionId": "golden",
  "trade": "decking",
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
  "message": "How many flights of stairs?",
  "options": [
    {
      "label": "1 flight",
      "value": 1
    },
    {
      "label": "2 flights",
      "value": 2
    },
    {
      "label": "3 flights",
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
    "deckHeight": "elevated",
    "material": "merbau",
    "areaSqm": 25,
    "attachment": "attached",
    "removal": "timber_deck",
    "balustrade": "timber",
    "balustradeLm": 12,
    "stairs": "timber",
    "stairFlights": null,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 11,
      "cursor": {
        "deckHeight": 0,
        "material": 0,
        "areaSqm": 0,
        "attachment": 0,
        "removal": 0,
        "balustrade": 0,
        "balustradeLm": 0,
        "stairs": 0,
        "stairFlights": 0
      },
      "lastAsked": "stairFlights",
      "lastQuestion": "How many flights of stairs?",
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
      },
      "answers": 0,
      "history": [
        {
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the deck going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "How far off the ground will the deck sit?"
        },
        {
          "you": "25",
          "me": "Will it be attached to the house, or standing on its own?"
        },
        {
          "you": "timber_deck",
          "me": "Do you need a balustrade?"
        },
        {
          "you": "12",
          "me": "Do you need stairs?"
        }
      ],
      "trade": "decking"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "deckHeight": {
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    "material": {
      "title": "Decking",
      "value": "Merbau"
    },
    "areaSqm": {
      "title": "Size",
      "value": "25m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Attached to the house"
    },
    "removal": {
      "title": "Old deck",
      "value": "An old timber deck"
    },
    "balustrade": {
      "title": "Balustrade",
      "value": "Timber"
    },
    "balustradeLm": {
      "title": "Balustrade length",
      "value": "12m"
    },
    "stairs": {
      "title": "Stairs",
      "value": "Standard timber stairs"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "deckHeight",
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Merbau"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "25m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Attached to the house"
    },
    {
      "key": "removal",
      "title": "Old deck",
      "value": "An old timber deck"
    },
    {
      "key": "balustrade",
      "title": "Balustrade",
      "value": "Timber"
    },
    {
      "key": "balustradeLm",
      "title": "Balustrade length",
      "value": "12m"
    },
    {
      "key": "stairs",
      "title": "Stairs",
      "value": "Standard timber stairs"
    }
  ],
  "checklistPending": [
    {
      "key": "stairFlights",
      "title": "Flights"
    },
    {
      "key": "conditions",
      "title": "Site"
    }
  ],
  "results": [],
  "avgRatePerMeter": null,
  "unit": "m2"
}
```

## turn 12

customer: "1"

```json
{
  "sessionId": "golden",
  "trade": "decking",
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
    "deckHeight": "elevated",
    "material": "merbau",
    "areaSqm": 25,
    "attachment": "attached",
    "removal": "timber_deck",
    "balustrade": "timber",
    "balustradeLm": 12,
    "stairs": "timber",
    "stairFlights": 1,
    "conditions": null,
    "existingPrice": null,
    "_ui": {
      "turn": 12,
      "cursor": {
        "deckHeight": 0,
        "material": 0,
        "areaSqm": 0,
        "attachment": 0,
        "removal": 0,
        "balustrade": 0,
        "balustradeLm": 0,
        "stairs": 0,
        "stairFlights": 0,
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
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the deck going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "How far off the ground will the deck sit?"
        },
        {
          "you": "25",
          "me": "Will it be attached to the house, or standing on its own?"
        },
        {
          "you": "timber_deck",
          "me": "Do you need a balustrade?"
        },
        {
          "you": "12",
          "me": "Do you need stairs?"
        }
      ],
      "trade": "decking"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "deckHeight": {
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    "material": {
      "title": "Decking",
      "value": "Merbau"
    },
    "areaSqm": {
      "title": "Size",
      "value": "25m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Attached to the house"
    },
    "removal": {
      "title": "Old deck",
      "value": "An old timber deck"
    },
    "balustrade": {
      "title": "Balustrade",
      "value": "Timber"
    },
    "balustradeLm": {
      "title": "Balustrade length",
      "value": "12m"
    },
    "stairs": {
      "title": "Stairs",
      "value": "Standard timber stairs"
    },
    "stairFlights": {
      "title": "Flights",
      "value": "1 flight"
    }
  },
  "checklistAnswered": [
    {
      "key": "suburb",
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    {
      "key": "deckHeight",
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Merbau"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "25m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Attached to the house"
    },
    {
      "key": "removal",
      "title": "Old deck",
      "value": "An old timber deck"
    },
    {
      "key": "balustrade",
      "title": "Balustrade",
      "value": "Timber"
    },
    {
      "key": "balustradeLm",
      "title": "Balustrade length",
      "value": "12m"
    },
    {
      "key": "stairs",
      "title": "Stairs",
      "value": "Standard timber stairs"
    },
    {
      "key": "stairFlights",
      "title": "Flights",
      "value": "1 flight"
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
  "unit": "m2"
}
```

## turn 13

customer: "none"

```json
{
  "sessionId": "golden",
  "trade": "decking",
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
  "message": "Got it — Berwick, VIC 3806, Up high — needs stairs, Merbau, 25m², Attached to the house, taking out an old timber deck, Timber, Standard timber stairs. All correct?",
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
    "deckHeight": "elevated",
    "material": "merbau",
    "areaSqm": 25,
    "attachment": "attached",
    "removal": "timber_deck",
    "balustrade": "timber",
    "balustradeLm": 12,
    "stairs": "timber",
    "stairFlights": 1,
    "conditions": [],
    "existingPrice": null,
    "_ui": {
      "turn": 13,
      "cursor": {
        "deckHeight": 0,
        "material": 0,
        "areaSqm": 0,
        "attachment": 0,
        "removal": 0,
        "balustrade": 0,
        "balustradeLm": 0,
        "stairs": 0,
        "stairFlights": 0,
        "conditions": 0
      },
      "lastAsked": null,
      "lastQuestion": "Got it — Berwick, VIC 3806, Up high — needs stairs, Merbau, 25m², Attached to the house, taking out an old timber deck, Timber, Standard timber stairs. All correct?",
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
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the deck going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "How far off the ground will the deck sit?"
        },
        {
          "you": "25",
          "me": "Will it be attached to the house, or standing on its own?"
        },
        {
          "you": "timber_deck",
          "me": "Do you need a balustrade?"
        },
        {
          "you": "12",
          "me": "Do you need stairs?"
        }
      ],
      "trade": "decking"
    }
  },
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "deckHeight": {
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    "material": {
      "title": "Decking",
      "value": "Merbau"
    },
    "areaSqm": {
      "title": "Size",
      "value": "25m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Attached to the house"
    },
    "removal": {
      "title": "Old deck",
      "value": "An old timber deck"
    },
    "balustrade": {
      "title": "Balustrade",
      "value": "Timber"
    },
    "balustradeLm": {
      "title": "Balustrade length",
      "value": "12m"
    },
    "stairs": {
      "title": "Stairs",
      "value": "Standard timber stairs"
    },
    "stairFlights": {
      "title": "Flights",
      "value": "1 flight"
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
      "key": "deckHeight",
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Merbau"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "25m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Attached to the house"
    },
    {
      "key": "removal",
      "title": "Old deck",
      "value": "An old timber deck"
    },
    {
      "key": "balustrade",
      "title": "Balustrade",
      "value": "Timber"
    },
    {
      "key": "balustradeLm",
      "title": "Balustrade length",
      "value": "12m"
    },
    {
      "key": "stairs",
      "title": "Stairs",
      "value": "Standard timber stairs"
    },
    {
      "key": "stairFlights",
      "title": "Flights",
      "value": "1 flight"
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
  "unit": "m2"
}
```

## turn 14

customer: "yes"

```json
{
  "sessionId": "golden",
  "trade": "decking",
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
      "businessId": "deck-1",
      "autoAcceptsAi": true,
      "businessName": "Berwick Decks",
      "suburb": "Berwick, VIC 3806",
      "ratePerMeter": 625,
      "estimatedTotal": 19365,
      "notes": "incl. GST · In your suburb · 4.9★ (78) · Old deck removed · 12m of balustrade included · Stairs included · Includes $150 site inspection"
    }
  ],
  "avgRatePerMeter": 625,
  "unit": "m2",
  "comparison": {
    "potentialSavings": null,
    "marketAverage": 19365,
    "totalQuotesScreened": 1,
    "userExistingPrice": null,
    "quotes": [
      {
        "businessId": "deck-1",
        "autoAcceptsAi": true,
        "businessName": "Berwick Decks",
        "ratePerMeter": 625,
        "projectTotalMin": 19365,
        "projectTotalMax": 19365,
        "badges": [
          "incl. GST",
          "In your suburb",
          "4.9★ (78)",
          "Old deck removed",
          "12m of balustrade included",
          "Stairs included",
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
    "deckHeight": "elevated",
    "material": "merbau",
    "areaSqm": 25,
    "attachment": "attached",
    "removal": "timber_deck",
    "balustrade": "timber",
    "balustradeLm": 12,
    "stairs": "timber",
    "stairFlights": 1,
    "conditions": [],
    "existingPrice": null,
    "_ui": {
      "turn": 14,
      "cursor": {
        "deckHeight": 0,
        "material": 0,
        "areaSqm": 0,
        "attachment": 0,
        "removal": 0,
        "balustrade": 0,
        "balustradeLm": 0,
        "stairs": 0,
        "stairFlights": 0,
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
          "you": "I need a decking quote",
          "me": "Happy to help with that. Mind if I ask a few quick questions?"
        },
        {
          "you": "yes go ahead",
          "me": "Which suburb is the deck going in? A postcode works too."
        },
        {
          "you": "Berwick",
          "me": "How far off the ground will the deck sit?"
        },
        {
          "you": "25",
          "me": "Will it be attached to the house, or standing on its own?"
        },
        {
          "you": "timber_deck",
          "me": "Do you need a balustrade?"
        },
        {
          "you": "12",
          "me": "Do you need stairs?"
        }
      ],
      "trade": "decking"
    }
  },
  "checklistComplete": true,
  "checklistDisplay": {
    "suburb": {
      "title": "Suburb",
      "value": "Berwick, VIC 3806"
    },
    "deckHeight": {
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    "material": {
      "title": "Decking",
      "value": "Merbau"
    },
    "areaSqm": {
      "title": "Size",
      "value": "25m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Attached to the house"
    },
    "removal": {
      "title": "Old deck",
      "value": "An old timber deck"
    },
    "balustrade": {
      "title": "Balustrade",
      "value": "Timber"
    },
    "balustradeLm": {
      "title": "Balustrade length",
      "value": "12m"
    },
    "stairs": {
      "title": "Stairs",
      "value": "Standard timber stairs"
    },
    "stairFlights": {
      "title": "Flights",
      "value": "1 flight"
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
      "key": "deckHeight",
      "title": "Height",
      "value": "Up high — needs stairs"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Merbau"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "25m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Attached to the house"
    },
    {
      "key": "removal",
      "title": "Old deck",
      "value": "An old timber deck"
    },
    {
      "key": "balustrade",
      "title": "Balustrade",
      "value": "Timber"
    },
    {
      "key": "balustradeLm",
      "title": "Balustrade length",
      "value": "12m"
    },
    {
      "key": "stairs",
      "title": "Stairs",
      "value": "Standard timber stairs"
    },
    {
      "key": "stairFlights",
      "title": "Flights",
      "value": "1 flight"
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
