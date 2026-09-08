# 04 a complete tiling price list, approved and extracted

Guards: the second trade end to end - per-m2 rates and a per-job bathroom package surviving in one table, tiling's own couldNotUse wording, and no fencing field anywhere in the response

Fixture: `tests/fixtures/description-COMPLETE-tiling.txt` (1813 characters)

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
        "labour_only"
      ],
      "enabledJobTypes": [
        "floor_only",
        "outdoor",
        "wall_only",
        "bathroom",
        "kitchen_splashback"
      ],
      "rates": {
        "floor_only": [
          {
            "tileType": null,
            "price": 65,
            "unit": "per_sqm"
          }
        ],
        "outdoor": [
          {
            "tileType": null,
            "price": 85,
            "unit": "per_sqm"
          }
        ],
        "wall_only": [
          {
            "tileType": null,
            "price": 68,
            "unit": "per_sqm"
          }
        ],
        "bathroom": [
          {
            "tileType": null,
            "price": 4850,
            "unit": "per_job"
          }
        ],
        "kitchen_splashback": [
          {
            "tileType": null,
            "price": 580,
            "unit": "per_job"
          }
        ]
      },
      "tileSupply": [],
      "prep": [],
      "removals": [],
      "waterproofing": [],
      "siteConditions": [],
      "serviceArea": {
        "baseLocation": "Pakenham",
        "resolved": {
          "suburb": "Pakenham",
          "state": "VIC",
          "postcode": "3810",
          "lat": -38.0776708,
          "lng": 145.4818724,
          "source": "google"
        },
        "radiusKm": 25,
        "excludedAreas": []
      },
      "minimumCharge": 350,
      "callOutFee": null,
      "travelFee": null
    },
    "capabilities": {
      "businessName": "Paky Tiles",
      "warranty": {
        "text": null
      },
      "tags": [],
      "extras": [],
      "inclusions": [],
      "exclusions": []
    },
    "ratesSaved": 5,
    "otherOfferings": [],
    "notUsed": [
      "Read by the offline mock reader - tile types, preparation and tile supply are not extracted in mock mode."
    ],
    "alsoWorthAdding": [],
    "labels": {
      "bathroom": "Bathroom",
      "shower": "Just the shower",
      "ensuite": "Ensuite",
      "laundry": "Laundry",
      "balcony": "Balcony",
      "any": "Yes, take them up",
      "ceramic": "Ceramic",
      "porcelain": "Porcelain",
      "stone": "Stone tiles",
      "mosaic": "Mosaic",
      "adhesive": "Adhesive only",
      "labour_only": "I'm buying the tiles",
      "supply_and_install": "They supply the tiles",
      "restricted_access": "Hard to get to",
      "second_storey": "Upstairs",
      "stairs": "Stairs involved",
      "small_room": "Small room",
      "uneven_substrate": "Uneven floor",
      "large_format_600x1200": "Large format 600×1200",
      "large_format_900x900": "Large format 900×900",
      "large_format_1200x1200": "Large format 1200×1200",
      "large_format_1200x2400": "Large format 1200×2400",
      "large_format_600x600": "Large format 600×600",
      "large_format_800x800": "Large format 800×800",
      "subway": "Subway",
      "glass_mosaic": "Glass mosaic",
      "feature_mosaic": "Feature mosaic",
      "natural_stone": "Natural stone",
      "terrazzo": "Terrazzo",
      "outdoor_porcelain": "Outdoor porcelain",
      "herringbone": "Herringbone pattern",
      "kitchen_splashback": "Kitchen splashback",
      "floor_only": "Floor only",
      "wall_only": "Wall only",
      "outdoor": "Outdoor area",
      "per_metre": "per metre",
      "per_item": "each",
      "per_job": "per job",
      "per_sqm": "per m2"
    },
    "source": {
      "documents": [
        {
          "label": "typed",
          "kind": "text",
          "readBy": "text",
          "chars": 1812,
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
    "rates": 5,
    "tileSupply": 0,
    "prep": 0,
    "removals": 0,
    "waterproofing": 0,
    "siteConditions": 0,
    "extras": 0,
    "tags": 0,
    "otherOfferings": 0,
    "couldNotUse": 1
  },
  "textChars": 1812
}
```
