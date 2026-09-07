# 01 a complete price list, approved and extracted

Guards: the approved path end to end - 20 rates surviving the quote gate, the height band keys code builds from the number, enabledMaterials, the coverage counts, and the shape of the screen a business sees

Fixture: `tests/fixtures/description-COMPLETE-fencing.txt` (3352 characters)

## what the business is told

```json
{
  "approved": true,
  "status": "verified",
  "business": {
    "opening": "Your details have been approved. Below is what we have saved from them.",
    "pricing": {
      "gstIncluded": true,
      "enabledMaterials": [
        "timber_pine",
        "timber_hardwood",
        "colorbond",
        "aluminium",
        "pool_aluminium",
        "chainmesh",
        "rural_wire"
      ],
      "rates": {
        "timber_pine": {
          "0.9m": 62,
          "1.2m": 71,
          "1.5m": 79,
          "1.8m": 85,
          "2.1m": 104
        },
        "timber_hardwood": {
          "1.5m": 118,
          "1.8m": 132,
          "2.1m": 158
        },
        "colorbond": {
          "1.2m": 88,
          "1.5m": 96,
          "1.8m": 110,
          "2.1m": 128
        },
        "aluminium": {
          "1.2m": 165,
          "1.5m": 184,
          "1.8m": 210
        },
        "pool_aluminium": {
          "1.2m": 195,
          "1.35m": 215
        },
        "chainmesh": {
          "1.8m": 74,
          "2.4m": 92
        },
        "rural_wire": {
          "1.2m": 38
        }
      },
      "removals": [],
      "gates": [],
      "siteConditions": [],
      "serviceArea": {
        "baseLocation": "Berwick and we travel up to",
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
      "minimumCharge": 850
    },
    "capabilities": {
      "businessName": "Trade: fencing",
      "specs": [],
      "permits": {
        "included": null,
        "fee": null
      },
      "warranty": {
        "years": null,
        "text": null
      },
      "tags": [],
      "extras": [],
      "inclusions": [],
      "exclusions": []
    },
    "ratesSaved": 20,
    "otherOfferings": [],
    "notUsed": [
      "Read by the offline mock reader - gates, removals and surcharges are not extracted in mock mode."
    ],
    "alsoWorthAdding": [],
    "labels": {
      "timber_pine": "Treated pine",
      "timber_hardwood": "Hardwood timber",
      "colorbond": "Colorbond",
      "aluminium": "Aluminium",
      "pool_aluminium": "Pool fencing — aluminium",
      "pool_glass": "Pool fencing — glass",
      "chainmesh": "Chainmesh",
      "rural_wire": "Rural wire",
      "pedestrian_single": "Single pedestrian gate",
      "driveway_double": "Double driveway gate",
      "driveway_sliding": "Sliding driveway gate",
      "motor_automation": "Motorised / automation",
      "sloped": "Sloped block",
      "rock": "Rocky ground",
      "restricted_access": "Restricted access",
      "hand_dig": "Hand dig needed",
      "timber": "Timber fence",
      "metal": "Metal fence",
      "any": "Existing fence",
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
          "chars": 3351,
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
    "rates": 20,
    "removals": 0,
    "gates": 0,
    "siteConditions": 0,
    "extras": 0,
    "tags": 0,
    "specs": 0,
    "otherOfferings": 0,
    "couldNotUse": 1
  },
  "textChars": 3351
}
```
