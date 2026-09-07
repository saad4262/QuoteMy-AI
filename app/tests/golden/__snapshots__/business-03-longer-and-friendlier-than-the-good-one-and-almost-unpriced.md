# 03 longer and friendlier than the good one, and almost unpriced

Guards: ranges, POA and "from" on core rates are all caught, while "from $1,450" on a gate motor is NOT - that carve-out is the false rejection this fixture produced once, and rule 4a exists because of it

Fixture: `tests/fixtures/description-BAD-daves-fencing.txt` (3291 characters)

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
        "what": "Give one set price per metre for each fence type and height you do - most of what you sent is written as a range or a \"call us\".",
        "example": "Colorbond 1.8m - $110/m (your figure)"
      },
      {
        "kind": "missing",
        "what": "Say whether your prices include GST.",
        "example": "All prices include GST"
      },
      {
        "kind": "missing",
        "what": "Add the smallest job you will take on and what you charge for it.",
        "example": "Minimum charge $850"
      },
      {
        "kind": "missing",
        "what": "Add what you charge per metre to take away an old fence.",
        "example": null
      },
      {
        "kind": "missing",
        "what": "Say who arranges and pays for council permits, and any fee.",
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
          "chars": 3290,
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
    "missing": 4,
    "unclear": 1
  },
  "textChars": 3290
}
```
