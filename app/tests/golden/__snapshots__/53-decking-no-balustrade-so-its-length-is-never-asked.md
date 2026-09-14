# 53 decking, no balustrade, so its length is never asked

Guards: the conditional field: `balustradeLm` hangs off `balustrade` with dependsOn, so saying "no balustrade" must skip the length question entirely rather than asking for the length of something that does not exist

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

customer: "low_level"

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
    "deckHeight": "low_level",
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
      "value": "A step or two up"
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
      "value": "A step or two up"
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

customer: "composite"

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
    "deckHeight": "low_level",
    "material": "composite",
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
      "value": "A step or two up"
    },
    "material": {
      "title": "Decking",
      "value": "Composite"
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
      "value": "A step or two up"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Composite"
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

customer: "18"

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
    "deckHeight": "low_level",
    "material": "composite",
    "areaSqm": 18,
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
          "you": "18",
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
      "value": "A step or two up"
    },
    "material": {
      "title": "Decking",
      "value": "Composite"
    },
    "areaSqm": {
      "title": "Size",
      "value": "18m²"
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
      "value": "A step or two up"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Composite"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "18m²"
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

customer: "freestanding"

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
    "deckHeight": "low_level",
    "material": "composite",
    "areaSqm": 18,
    "attachment": "freestanding",
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
          "you": "18",
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
      "value": "A step or two up"
    },
    "material": {
      "title": "Decking",
      "value": "Composite"
    },
    "areaSqm": {
      "title": "Size",
      "value": "18m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Standing on its own"
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
      "value": "A step or two up"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Composite"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "18m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Standing on its own"
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
    "deckHeight": "low_level",
    "material": "composite",
    "areaSqm": 18,
    "attachment": "freestanding",
    "removal": "none",
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
          "you": "18",
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
      "value": "A step or two up"
    },
    "material": {
      "title": "Decking",
      "value": "Composite"
    },
    "areaSqm": {
      "title": "Size",
      "value": "18m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Standing on its own"
    },
    "removal": {
      "title": "Old deck",
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
      "key": "deckHeight",
      "title": "Height",
      "value": "A step or two up"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Composite"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "18m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Standing on its own"
    },
    {
      "key": "removal",
      "title": "Old deck",
      "value": "Nothing to remove"
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
    "deckHeight": "low_level",
    "material": "composite",
    "areaSqm": 18,
    "attachment": "freestanding",
    "removal": "none",
    "balustrade": "none",
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
          "you": "18",
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
      "value": "A step or two up"
    },
    "material": {
      "title": "Decking",
      "value": "Composite"
    },
    "areaSqm": {
      "title": "Size",
      "value": "18m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Standing on its own"
    },
    "removal": {
      "title": "Old deck",
      "value": "Nothing to remove"
    },
    "balustrade": {
      "title": "Balustrade",
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
      "key": "deckHeight",
      "title": "Height",
      "value": "A step or two up"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Composite"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "18m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Standing on its own"
    },
    {
      "key": "removal",
      "title": "Old deck",
      "value": "Nothing to remove"
    },
    {
      "key": "balustrade",
      "title": "Balustrade",
      "value": "None"
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

## turn 10

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
    "deckHeight": "low_level",
    "material": "composite",
    "areaSqm": 18,
    "attachment": "freestanding",
    "removal": "none",
    "balustrade": "none",
    "balustradeLm": null,
    "stairs": "none",
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
        "stairs": 0,
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
          "you": "18",
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
      "value": "A step or two up"
    },
    "material": {
      "title": "Decking",
      "value": "Composite"
    },
    "areaSqm": {
      "title": "Size",
      "value": "18m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Standing on its own"
    },
    "removal": {
      "title": "Old deck",
      "value": "Nothing to remove"
    },
    "balustrade": {
      "title": "Balustrade",
      "value": "None"
    },
    "stairs": {
      "title": "Stairs",
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
      "key": "deckHeight",
      "title": "Height",
      "value": "A step or two up"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Composite"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "18m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Standing on its own"
    },
    {
      "key": "removal",
      "title": "Old deck",
      "value": "Nothing to remove"
    },
    {
      "key": "balustrade",
      "title": "Balustrade",
      "value": "None"
    },
    {
      "key": "stairs",
      "title": "Stairs",
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
  "unit": "m2"
}
```

## turn 11

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
  "message": "Got it — Berwick, VIC 3806, A step or two up, Composite, 18m², Standing on its own. All correct?",
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
    "deckHeight": "low_level",
    "material": "composite",
    "areaSqm": 18,
    "attachment": "freestanding",
    "removal": "none",
    "balustrade": "none",
    "balustradeLm": null,
    "stairs": "none",
    "stairFlights": null,
    "conditions": [],
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
        "stairs": 0,
        "conditions": 0
      },
      "lastAsked": null,
      "lastQuestion": "Got it — Berwick, VIC 3806, A step or two up, Composite, 18m², Standing on its own. All correct?",
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
          "you": "18",
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
      "value": "A step or two up"
    },
    "material": {
      "title": "Decking",
      "value": "Composite"
    },
    "areaSqm": {
      "title": "Size",
      "value": "18m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Standing on its own"
    },
    "removal": {
      "title": "Old deck",
      "value": "Nothing to remove"
    },
    "balustrade": {
      "title": "Balustrade",
      "value": "None"
    },
    "stairs": {
      "title": "Stairs",
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
      "key": "deckHeight",
      "title": "Height",
      "value": "A step or two up"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Composite"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "18m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Standing on its own"
    },
    {
      "key": "removal",
      "title": "Old deck",
      "value": "Nothing to remove"
    },
    {
      "key": "balustrade",
      "title": "Balustrade",
      "value": "None"
    },
    {
      "key": "stairs",
      "title": "Stairs",
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
  "unit": "m2"
}
```

## turn 12

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
      "ratePerMeter": 560,
      "estimatedTotal": 10230,
      "notes": "incl. GST · In your suburb · 4.9★ (78) · Includes $150 site inspection"
    }
  ],
  "avgRatePerMeter": 560,
  "unit": "m2",
  "comparison": {
    "potentialSavings": null,
    "marketAverage": 10230,
    "totalQuotesScreened": 1,
    "userExistingPrice": null,
    "quotes": [
      {
        "businessId": "deck-1",
        "autoAcceptsAi": true,
        "businessName": "Berwick Decks",
        "ratePerMeter": 560,
        "projectTotalMin": 10230,
        "projectTotalMax": 10230,
        "badges": [
          "incl. GST",
          "In your suburb",
          "4.9★ (78)",
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
    "deckHeight": "low_level",
    "material": "composite",
    "areaSqm": 18,
    "attachment": "freestanding",
    "removal": "none",
    "balustrade": "none",
    "balustradeLm": null,
    "stairs": "none",
    "stairFlights": null,
    "conditions": [],
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
        "stairs": 0,
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
          "you": "18",
          "me": "Will it be attached to the house, or standing on its own?"
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
      "value": "A step or two up"
    },
    "material": {
      "title": "Decking",
      "value": "Composite"
    },
    "areaSqm": {
      "title": "Size",
      "value": "18m²"
    },
    "attachment": {
      "title": "Attachment",
      "value": "Standing on its own"
    },
    "removal": {
      "title": "Old deck",
      "value": "Nothing to remove"
    },
    "balustrade": {
      "title": "Balustrade",
      "value": "None"
    },
    "stairs": {
      "title": "Stairs",
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
      "key": "deckHeight",
      "title": "Height",
      "value": "A step or two up"
    },
    {
      "key": "material",
      "title": "Decking",
      "value": "Composite"
    },
    {
      "key": "areaSqm",
      "title": "Size",
      "value": "18m²"
    },
    {
      "key": "attachment",
      "title": "Attachment",
      "value": "Standing on its own"
    },
    {
      "key": "removal",
      "title": "Old deck",
      "value": "Nothing to remove"
    },
    {
      "key": "balustrade",
      "title": "Balustrade",
      "value": "None"
    },
    {
      "key": "stairs",
      "title": "Stairs",
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
