# 07 impressive, detailed, and almost none of it quotable

Guards: ranges, POA and "from" on core rates are all caught, while "from $850" on an engineering certificate and "from $150" on a site inspection are NOT - that is rule 4a, the carve-out fencing's gate motor already produced one false rejection over. Also the supply rule: this business says it can do either model and prices neither of them separately, which is the failure that reads as thorough and quotes nobody

Fixture: `tests/fixtures/description-THIN-retaining-wall.txt` (2196 characters)

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
        "what": "Say whether you supply the materials, install what the customer buys, or both - and give a rate per metre for each one you do.",
        "example": "Timber sleeper installation $145/m. Timber supply and install $285/m."
      },
      {
        "kind": "missing",
        "what": "Say what heights your rates cover - either a price per height band, or one line saying a single rate covers every height you build.",
        "example": "These rates cover every height we build, up to 1.2m"
      },
      {
        "kind": "missing",
        "what": "Add the smallest job you will take on and what you charge for it.",
        "example": "Minimum installation charge $650"
      },
      {
        "kind": "missing",
        "what": "Say where you work out of and how far you travel.",
        "example": "Based in Berwick, we travel 30km"
      },
      {
        "kind": "missing",
        "what": "Say whether your prices include GST.",
        "example": "All prices include GST"
      },
      {
        "kind": "unclear",
        "what": "Give one firm price per metre for each wall system - some of what you sent is a range or a \"call us\".",
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
          "chars": 2195,
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
    "missing": 5,
    "unclear": 1
  },
  "textChars": 2195
}
```
