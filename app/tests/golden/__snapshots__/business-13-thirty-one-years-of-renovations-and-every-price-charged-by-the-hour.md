# 13 thirty-one years of renovations, and every price charged by the hour

Guards: this trade's characteristic failure, and the cleanest example of it in the suite. Charging for your time is an honest, defensible way to renovate a house and it cannot answer "what does my bathroom cost" - so the document is complete, priced throughout, and quotes nobody. It produces exactly ONE fix, which makes it the tightest test of the rejectedNotQuotable wording: the prices are all there and none is quotable. It also guards the negation in the structural-claim check - this business says it will NOT tell you a wall can come out until it has looked, which is the rule obeyed perfectly, and a careless check flags it as the rule broken

Fixture: `tests/fixtures/description-BAD-renovation.txt` (2364 characters)

## what the business is told

```json
{
  "approved": false,
  "status": "unverified",
  "business": {
    "opening": "We have been through the details you sent. The prices are all there - they are just not in a form we can quote a customer from yet.",
    "fixes": [
      {
        "kind": "unclear",
        "what": "Give one set price for each room you renovate - a flat price for the room is what we need, not an hourly rate.",
        "example": "Bathroom renovation labour $6,850"
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
          "chars": 2363,
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
    "missing": 0,
    "unclear": 1
  },
  "textChars": 2363
}
```
