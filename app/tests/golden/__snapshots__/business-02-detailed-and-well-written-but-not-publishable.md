# 02 detailed and well written, but not publishable

Guards: one non-price item missing is still blocking, and a rejected submission writes NOTHING to the profile - an incomplete list must never overwrite figures already approved

Fixture: `tests/fixtures/description-GOOD-southeast-fencing.txt` (3301 characters)

## what the business is told

```json
{
  "approved": false,
  "status": "unverified",
  "business": {
    "opening": "We have been through the details you sent. A few things need updating before your profile can go live.",
    "fixes": [
      {
        "kind": "missing",
        "what": "Add how long your workmanship is warranted for.",
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
          "chars": 3300,
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
    "missing": 1,
    "unclear": 0
  },
  "textChars": 3300
}
```
