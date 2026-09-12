# 05 a complete kitchen price list, approved and extracted

Guards: the trade with no unit to measure - per-job prices keyed by size and per-item cabinet prices surviving in one table, the four cabinet types kept apart by their labels rather than collapsed into one rate priced four times, and no fencing or tiling field anywhere in the response

Fixture: `tests/fixtures/description-COMPLETE-kitchen.txt` (2107 characters)

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
      "enabledKitchenSizes": [
        "small",
        "standard",
        "large"
      ],
      "rates": {
        "general": [
          {
            "size": "small",
            "label": null,
            "price": 1950,
            "unit": "per_job"
          },
          {
            "size": "standard",
            "label": null,
            "price": 2850,
            "unit": "per_job"
          },
          {
            "size": "large",
            "label": null,
            "price": 4250,
            "unit": "per_job"
          },
          {
            "size": null,
            "label": "Base cabinet installation",
            "price": 180,
            "unit": "per_item"
          },
          {
            "size": null,
            "label": "Wall cabinet installation",
            "price": 165,
            "unit": "per_item"
          },
          {
            "size": null,
            "label": "Tall cabinet installation",
            "price": 280,
            "unit": "per_item"
          },
          {
            "size": null,
            "label": "Drawer unit installation",
            "price": 190,
            "unit": "per_item"
          }
        ]
      },
      "cabinetSupply": [
        {
          "label": "Standard Custom Kitchen Cabinet Package",
          "price": 8950,
          "unit": "per_job"
        }
      ],
      "benchtops": [
        {
          "material": "laminate",
          "price": 850
        },
        {
          "material": "timber",
          "price": 1150
        },
        {
          "material": "stone",
          "price": 1250
        }
      ],
      "removals": [
        {
          "removes": "full_demolition",
          "price": 1650
        },
        {
          "removes": "cabinets_only",
          "price": 950
        },
        {
          "removes": "benchtop_only",
          "price": 380
        },
        {
          "removes": "splashback_only",
          "price": 420
        }
      ],
      "prep": [],
      "extras": [],
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
        "radiusKm": 30,
        "excludedAreas": []
      },
      "minimumCharge": 450,
      "siteMeasureFee": 120,
      "travelFee": 85
    },
    "capabilities": {
      "businessName": "Beky Kitchens",
      "warranty": {
        "text": null
      },
      "tags": [],
      "inclusions": [],
      "exclusions": []
    },
    "ratesSaved": 7,
    "otherOfferings": [],
    "notUsed": [
      "Read by the offline mock reader - preparation, extras and other offerings are not extracted in mock mode."
    ],
    "alsoWorthAdding": [],
    "labels": {
      "any": "Yes, take it out",
      "full_demolition": "Everything — cabinets, bench, splashback",
      "cabinets_only": "Just the cabinets",
      "benchtop_only": "Just the benchtop",
      "splashback_only": "Just the splashback",
      "labour_only": "I'm supplying the cabinets",
      "supply_and_install": "They supply the cabinets",
      "small": "Small — a galley or one run",
      "standard": "Standard — an L-shape",
      "large": "Large — a U-shape or an island",
      "island": "An island",
      "pantry": "A pantry",
      "splashback_prep": "Splashback preparation",
      "appliance_integration": "Built-in appliances",
      "sink": "A sink",
      "laundry": "Laundry cabinets too",
      "appliance_garage": "An appliance garage",
      "open_shelving": "Open shelving",
      "pull_out_bin": "A pull-out bin",
      "corner_storage": "Corner storage",
      "wall_prep": "Wall preparation",
      "floor_prep": "Floor preparation",
      "floor_levelling": "Floor levelling",
      "plaster_repair": "Plaster repair",
      "laminate": "Laminate",
      "timber": "Timber",
      "stone": "Stone",
      "new_kitchen": "A brand new kitchen",
      "replacement": "Replacing the old one",
      "install_only": "Fitting one I've bought",
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
          "chars": 2106,
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
    "rates": 7,
    "cabinetSupply": 1,
    "benchtops": 3,
    "removals": 4,
    "prep": 0,
    "extras": 0,
    "tags": 0,
    "otherOfferings": 0,
    "couldNotUse": 1
  },
  "textChars": 2106
}
```
