# 09 nineteen years of decks, and a balustrade priced by the wrong thing

Guards: two failures this trade makes and no other can. A balustrade at "$180 per square metre of deck" is priced against the floor behind it rather than the edge it runs along, and "most backyard decks don't need a permit anyway" is a claim about somebody else's site that nobody may make. Ranges and POA on the boards are caught too, while "from $890" on engineering and "from $350" on design are NOT - rule 4a again

Fixture: `tests/fixtures/description-THIN-decking.txt` (2259 characters)

## what the business is told

```json
{
  "approved": false,
  "status": "unverified",
  "business": {
    "opening": "We have been through the details you sent. A few things need updating before your profile can go live.",
    "fixes": [
      {
        "kind": "unclear",
        "what": "Your balustrade is priced by the square metre — it runs along the deck edge, so we need it per linear metre.",
        "example": "Timber balustrade $220 per linear metre"
      },
      {
        "kind": "unclear",
        "what": "Please do not say decks generally do not need a permit — it depends on the height, the boundary and the site. Say who arranges and pays for permits instead.",
        "example": "Permits depend on the site. We arrange the application from $650; council fees are the customer’s."
      },
      {
        "kind": "missing",
        "what": "Add the smallest job you will take on and what you charge for it.",
        "example": "Minimum charge $1,200"
      },
      {
        "kind": "missing",
        "what": "Say where you work out of and how far you travel.",
        "example": "Based in Berwick, we travel 20km"
      },
      {
        "kind": "missing",
        "what": "Say whether your prices include GST.",
        "example": "All prices include GST"
      },
      {
        "kind": "unclear",
        "what": "Give one firm price per square metre for each board — some of what you sent is a range or a \"call us\".",
        "example": null
      }
    ],
    "alsoWorthAdding": [],
    "notUsed": [],
    "source": {
      "documents": [
        {
          "label": "typed",
          "kind": "text",
          "readBy": "text",
          "chars": 2258,
          "unreadable": false
        }
      ]
    },
    "nextStep": "Update your details and send them through again for approval. If something above does not look right, use the contact button below and one of our team will go through it with you."
  }
}
```

## what was recorded

```json
{
  "submissionId": "golden-submission",
  "decision": "needs_updates",
  "fixCounts": {
    "missing": 3,
    "unclear": 3
  },
  "textChars": 2258
}
```
