# 06 a complete retaining wall price list, approved and extracted

Guards: the trade that publishes the SAME WALL TWICE - nine rates split across two supply columns, each one keeping the column it was written under, so a $145 installation rate and a $285 supply-and-install rate for the same timber sleeper wall survive as two rates and not as one priced twice. Also the per-hour and per-post groundworks staying OUT of the quotable rates, and enabledWallTypes rather than enabledMaterials, which is what stops the whole document being read back as a fence

Fixture: `tests/fixtures/description-COMPLETE-retaining-wall.txt` (3450 characters)

## what the business is told

```json
{
  "approved": true,
  "status": "verified",
  "business": {
    "opening": "Your details have been approved. Below is what we have saved from them.",
    "pricing": {
      "gstIncluded": true,
      "supplyModels": [
        "supply_and_install",
        "labour_only"
      ],
      "enabledWallTypes": [
        "timber_sleeper",
        "timber_post",
        "concrete_sleeper",
        "steel_post",
        "premium_timber",
        "tiered"
      ],
      "rates": {
        "labour_only": [
          {
            "wallType": "timber_sleeper",
            "heightBand": null,
            "pricePerMetre": 145
          },
          {
            "wallType": "timber_post",
            "heightBand": null,
            "pricePerMetre": 155
          },
          {
            "wallType": "concrete_sleeper",
            "heightBand": null,
            "pricePerMetre": 185
          },
          {
            "wallType": "steel_post",
            "heightBand": null,
            "pricePerMetre": 195
          }
        ],
        "supply_and_install": [
          {
            "wallType": "timber_sleeper",
            "heightBand": null,
            "pricePerMetre": 285
          },
          {
            "wallType": "premium_timber",
            "heightBand": null,
            "pricePerMetre": 325
          },
          {
            "wallType": "concrete_sleeper",
            "heightBand": null,
            "pricePerMetre": 395
          },
          {
            "wallType": "steel_post",
            "heightBand": null,
            "pricePerMetre": 425
          },
          {
            "wallType": "tiered",
            "heightBand": null,
            "pricePerMetre": 450
          }
        ]
      },
      "drainage": [
        {
          "type": "full_package",
          "price": 650,
          "unit": "per_job"
        },
        {
          "type": "ag_pipe",
          "price": 55,
          "unit": "per_metre"
        },
        {
          "type": "drainage_gravel",
          "price": 85,
          "unit": "per_metre"
        },
        {
          "type": "geotextile_fabric",
          "price": 35,
          "unit": "per_metre"
        },
        {
          "type": "drainage_outlet",
          "price": 180,
          "unit": "per_item"
        }
      ],
      "removals": [
        {
          "removes": "timber_wall",
          "price": 85,
          "unit": "per_metre"
        },
        {
          "removes": "concrete_sleeper_wall",
          "price": 125,
          "unit": "per_metre"
        },
        {
          "removes": "steel_post",
          "price": 95,
          "unit": "per_item"
        },
        {
          "removes": "timber_post",
          "price": 75,
          "unit": "per_item"
        }
      ],
      "groundworks": [
        {
          "type": "soil_removal",
          "price": 720,
          "unit": "per_job"
        },
        {
          "type": "excavation",
          "price": 95,
          "unit": "per_hour"
        },
        {
          "type": "post_holes",
          "price": 75,
          "unit": "per_item"
        },
        {
          "type": "footings",
          "price": 95,
          "unit": "per_item"
        },
        {
          "type": "backfill",
          "price": 75,
          "unit": "per_metre"
        },
        {
          "type": "compacted_backfill",
          "price": 95,
          "unit": "per_metre"
        },
        {
          "type": "site_cleanup",
          "price": 250,
          "unit": "per_job"
        }
      ],
      "siteConditions": [],
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
        "radiusKm": 30,
        "excludedAreas": []
      },
      "minimumCharge": 650,
      "siteInspectionFee": 150,
      "travelFee": 95
    },
    "capabilities": {
      "businessName": "Berwick Retaining Wall",
      "engineering": {
        "text": "We arrange the engineering from $850 and council fees are the customer's.",
        "price": 850,
        "isFromPrice": true
      },
      "warranty": {
        "text": "Ten year workmanship warranty on everything we build."
      },
      "tags": [],
      "inclusions": [],
      "exclusions": []
    },
    "ratesSaved": 9,
    "otherOfferings": [],
    "notUsed": [
      "Read by the offline mock reader - site conditions, extras and other offerings are not extracted in mock mode."
    ],
    "alsoWorthAdding": [],
    "labels": {
      "any": "Yes, take it out",
      "timber_wall": "An old timber wall",
      "concrete_sleeper_wall": "An old concrete sleeper wall",
      "steel_post": "Steel posts with sleepers",
      "timber_post": "Timber posts with sleepers",
      "labour_only": "I'm buying the materials",
      "supply_and_install": "They supply the materials",
      "full_package": "Yes — the standard drainage",
      "ag_pipe": "Ag-pipe",
      "drainage_gravel": "Drainage gravel",
      "geotextile_fabric": "Geotextile fabric",
      "drainage_outlet": "A drainage outlet",
      "excavation": "Excavation",
      "post_holes": "Post holes",
      "footings": "Concrete footings",
      "backfill": "Backfill",
      "compacted_backfill": "Compacted backfill",
      "soil_removal": "Soil removal",
      "site_cleanup": "Site clean-up",
      "restricted_access": "Hard to get to",
      "rock": "Rocky ground",
      "hard_clay": "Hard clay",
      "sloped": "Sloping site",
      "existing_structures": "Structures nearby",
      "machine_access": "No machine access",
      "caps": "Capping on top",
      "steps": "Steps",
      "corners": "Corners",
      "returns": "Returns",
      "fence_post_interface": "A fence on top",
      "repairs": "Repairs to an existing wall",
      "delivery": "Material delivery",
      "site_inspection": "A site inspection",
      "timber_sleeper": "Timber sleepers",
      "premium_timber": "Premium timber sleepers",
      "concrete_sleeper": "Concrete sleepers",
      "tiered": "Tiered — more than one level",
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
          "chars": 3449,
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
    "rates": 9,
    "supplyModels": 2,
    "drainage": 5,
    "removals": 4,
    "groundworks": 7,
    "siteConditions": 0,
    "extras": 0,
    "tags": 0,
    "otherOfferings": 0,
    "couldNotUse": 1
  },
  "textChars": 3449
}
```
