# 10 twenty-six years on the tools, and not one rate a customer can be quoted from

Guards: this trade's characteristic failure, and the first tiling fixture that is REJECTED. An hourly rate is a real and defensible way for a tiler to work, and it cannot answer "18 square metres of porcelain" - so the whole document is honest, complete, priced throughout, and quotes nobody. It is also the only fixture on this trade reaching the not_a_price_list outcome rather than needs_updates, and the day-ranges ("2 days, could be 9") must be caught as ranges rather than read as rates

Fixture: `tests/fixtures/description-BAD-tiling.txt` (3534 characters)

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
        "what": "Give one set price per square metre for each tile type you lay, floor and wall separately.",
        "example": "Standard floor tiling $65 per m2"
      },
      {
        "kind": "unclear",
        "what": "Add a unit to each preparation rate: surface preparation, floor levelling, screeding, adhesive removal, grinding, priming.",
        "example": "Surface preparation $350 per job"
      },
      {
        "kind": "missing",
        "what": "Say whether you supply the tiles, lay the customer's own, or both.",
        "example": null
      },
      {
        "kind": "unclear",
        "what": "Give one set price per square metre for each tile type - some of what you sent is a range or a \"call us\".",
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
          "chars": 3533,
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
    "unclear": 3
  },
  "textChars": 3533
}
```
