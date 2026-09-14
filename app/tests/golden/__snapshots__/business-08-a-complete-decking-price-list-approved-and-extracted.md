# 08 a complete decking price list, approved and extracted

Guards: the trade with THREE quantities in one quote - sixteen per-square-metre rates split across four height headings that carry DOWN the page, a balustrade kept in linear metres along the deck edge, and stairs counted in flights. Also enabledDeckMaterials rather than enabledMaterials, which is what stops the whole document being read back out of Firestore as a fence

Fixture: `tests/fixtures/description-COMPLETE-decking.txt` (3052 characters)

## what the business is told

```json
{
  "approved": true,
  "status": "verified",
  "business": {
    "opening": "Your details have been approved. Below is what we have saved from them.",
    "pricing": {
      "gstIncluded": true,
      "enabledDeckMaterials": [
        "treated_pine",
        "merbau",
        "spotted_gum",
        "blackbutt",
        "composite"
      ],
      "enabledDeckHeights": [
        "ground_level",
        "low_level",
        "elevated",
        "high_level"
      ],
      "rates": {
        "ground_level": [
          {
            "material": "treated_pine",
            "pricePerSqm": 280
          },
          {
            "material": "merbau",
            "pricePerSqm": 420
          },
          {
            "material": "spotted_gum",
            "pricePerSqm": 445
          },
          {
            "material": "blackbutt",
            "pricePerSqm": 465
          },
          {
            "material": "composite",
            "pricePerSqm": 520
          }
        ],
        "low_level": [
          {
            "material": "treated_pine",
            "pricePerSqm": 310
          },
          {
            "material": "merbau",
            "pricePerSqm": 455
          },
          {
            "material": "spotted_gum",
            "pricePerSqm": 480
          },
          {
            "material": "composite",
            "pricePerSqm": 560
          }
        ],
        "elevated": [
          {
            "material": "treated_pine",
            "pricePerSqm": 390
          },
          {
            "material": "merbau",
            "pricePerSqm": 540
          },
          {
            "material": "spotted_gum",
            "pricePerSqm": 570
          },
          {
            "material": "composite",
            "pricePerSqm": 650
          }
        ],
        "high_level": [
          {
            "material": "treated_pine",
            "pricePerSqm": 470
          },
          {
            "material": "merbau",
            "pricePerSqm": 640
          },
          {
            "material": "composite",
            "pricePerSqm": 760
          }
        ]
      },
      "balustrades": [
        {
          "type": "timber",
          "price": 220,
          "unit": "per_metre"
        },
        {
          "type": "aluminium",
          "price": 290,
          "unit": "per_metre"
        },
        {
          "type": "steel",
          "price": 340,
          "unit": "per_metre"
        },
        {
          "type": "wire",
          "price": 380,
          "unit": "per_metre"
        },
        {
          "type": "glass",
          "price": 520,
          "unit": "per_metre"
        }
      ],
      "stairs": [
        {
          "grade": "timber",
          "label": "Standard timber stair flight up to 5 steps $950 per flight.",
          "price": 950,
          "unit": "per_job"
        },
        {
          "grade": "hardwood",
          "label": "Hardwood stair flight up to 5 steps $1,350 per flight.",
          "price": 1350,
          "unit": "per_job"
        },
        {
          "grade": null,
          "label": "Each additional step above five $140 per step.",
          "price": 140,
          "unit": "per_item"
        }
      ],
      "screens": [
        {
          "type": "timber_batten",
          "price": 340,
          "unit": "per_sqm"
        },
        {
          "type": "merbau",
          "price": 420,
          "unit": "per_sqm"
        },
        {
          "type": "aluminium",
          "price": 460,
          "unit": "per_sqm"
        },
        {
          "type": "composite",
          "price": 480,
          "unit": "per_sqm"
        }
      ],
      "removals": [
        {
          "removes": "timber_deck",
          "price": 85,
          "unit": "per_sqm"
        },
        {
          "removes": "composite_deck",
          "price": 95,
          "unit": "per_sqm"
        }
      ],
      "siteConditions": [
        {
          "condition": "restricted_access",
          "price": 450,
          "percent": null,
          "unit": "per_job"
        },
        {
          "condition": "rock",
          "price": 180,
          "percent": null,
          "unit": "per_hour"
        },
        {
          "condition": "roots",
          "price": 140,
          "percent": null,
          "unit": "per_hour"
        }
      ],
      "extras": [],
      "serviceArea": {
        "baseLocation": "Berwick",
        "resolved": {
          "suburb": "Berwick",
          "state": "VIC",
          "postcode": "3806",
          "lat": -38.0309443,
          "lng": 145.3437469,
          "source": "google"
        },
        "radiusKm": 20,
        "excludedAreas": []
      },
      "minimumCharge": 1200,
      "siteInspectionFee": 150,
      "designFee": 450,
      "travelFee": 90
    },
    "capabilities": {
      "businessName": "Berwick Decks",
      "engineering": {
        "text": "We arrange engineering from $890 and the building permit application from $650.",
        "price": 890,
        "isFromPrice": true
      },
      "warranty": {
        "text": "Ten year workmanship warranty on our own work. Board manufacturer warranties are the maker's."
      },
      "tags": [],
      "inclusions": [],
      "exclusions": []
    },
    "ratesSaved": 16,
    "otherOfferings": [],
    "notUsed": [
      "Read by the offline mock reader - extras and other offerings are not extracted in mock mode."
    ],
    "alsoWorthAdding": [],
    "labels": {
      "any": "Yes, take it out",
      "timber_deck": "An old timber deck",
      "composite_deck": "An old composite deck",
      "attached": "Attached to the house",
      "freestanding": "Standing on its own",
      "restricted_access": "Hard to get to",
      "rock": "Rocky ground",
      "roots": "Tree roots",
      "poor_soil": "Soft or unstable soil",
      "sloped": "Sloping ground",
      "existing_concrete": "Concrete in the way",
      "stairs": "Stairs",
      "handrails": "Handrails",
      "skirting": "Skirting underneath",
      "seating": "Built-in seating",
      "planter_boxes": "Planter boxes",
      "access_hatch": "An access hatch",
      "pergola": "A pergola over it",
      "lighting": "Deck lighting",
      "oiling": "Oiling",
      "sanding": "Sanding",
      "restoration": "Restoring an old deck",
      "repairs": "Repairs",
      "design": "Design",
      "engineering_coordination": "Engineering",
      "permit_coordination": "Permit coordination",
      "timber_batten": "Timber battens",
      "hardwood": "Hardwood",
      "merbau": "Merbau",
      "aluminium": "Aluminium",
      "composite": "Composite",
      "timber": "Timber",
      "steel": "Steel",
      "glass": "Glass",
      "wire": "Wire balustrade",
      "ground_level": "Ground level",
      "low_level": "Low level",
      "elevated": "Elevated",
      "high_level": "High level",
      "treated_pine": "Treated pine",
      "spotted_gum": "Spotted gum",
      "blackbutt": "Blackbutt",
      "jarrah": "Jarrah",
      "pvc": "PVC",
      "per_metre": "per metre",
      "per_item": "each",
      "per_job": "per job",
      "per_sqm": "per m2",
      "per_hour": "per hour",
      "per_day": "per day"
    },
    "source": {
      "documents": [
        {
          "label": "typed",
          "kind": "text",
          "readBy": "text",
          "chars": 3051,
          "unreadable": false
        }
      ]
    },
    "nextStep": "Check the figures. If they are right, confirm them and your profile goes live for customers. If something is wrong, update your details and send them through again, or use the contact button below if you need a hand."
  }
}
```

## what was recorded

```json
{
  "submissionId": "golden-submission",
  "decision": "approved",
  "coverage": {
    "rates": 16,
    "heights": 4,
    "balustrades": 5,
    "stairs": 3,
    "screens": 4,
    "removals": 2,
    "siteConditions": 3,
    "extras": 0,
    "tags": 0,
    "otherOfferings": 0,
    "couldNotUse": 1
  },
  "textChars": 3051
}
```
