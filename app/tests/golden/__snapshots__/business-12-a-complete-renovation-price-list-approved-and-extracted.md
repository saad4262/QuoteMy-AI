# 12 a complete renovation price list, approved and extracted

Guards: the trade where a price with NO UNIT is the correct shape of a rate, not a defect. Eighty-six of this list's lines carry no unit at all, and every one of them must survive - rule 2a, on the trade that rule was written for. What this fixture proves beyond that is the four-way sort: rooms at flat prices, surfaces per square metre, items each and labour by the hour all sit in one column of dollar amounts, and only the unit beside the number tells them apart. "Kitchen renovation labour $4,850" must become a rate and "Kitchen cabinet installation $2,850" must not, though both name the same room

Fixture: `tests/fixtures/description-COMPLETE-renovation.txt` (5117 characters)

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
        "labour_only",
        "supply_and_install"
      ],
      "enabledRooms": [
        "bathroom",
        "ensuite",
        "kitchen",
        "laundry",
        "bedroom",
        "living_room",
        "dining_room",
        "home_office",
        "hallway",
        "open_plan"
      ],
      "rates": {
        "bathroom": [
          {
            "jobType": "full_renovation",
            "supply": null,
            "price": 6850,
            "unit": "per_job"
          },
          {
            "jobType": "demolition_only",
            "supply": null,
            "price": 1450,
            "unit": "per_job"
          }
        ],
        "ensuite": [
          {
            "jobType": "full_renovation",
            "supply": null,
            "price": 5950,
            "unit": "per_job"
          }
        ],
        "kitchen": [
          {
            "jobType": "full_renovation",
            "supply": null,
            "price": 4850,
            "unit": "per_job"
          },
          {
            "jobType": "demolition_only",
            "supply": null,
            "price": 1650,
            "unit": "per_job"
          }
        ],
        "laundry": [
          {
            "jobType": "full_renovation",
            "supply": null,
            "price": 3850,
            "unit": "per_job"
          },
          {
            "jobType": "demolition_only",
            "supply": null,
            "price": 750,
            "unit": "per_job"
          }
        ],
        "bedroom": [
          {
            "jobType": "full_renovation",
            "supply": null,
            "price": 2850,
            "unit": "per_job"
          }
        ],
        "living_room": [
          {
            "jobType": "full_renovation",
            "supply": null,
            "price": 3250,
            "unit": "per_job"
          }
        ],
        "dining_room": [
          {
            "jobType": "full_renovation",
            "supply": null,
            "price": 2450,
            "unit": "per_job"
          }
        ],
        "home_office": [
          {
            "jobType": "full_renovation",
            "supply": null,
            "price": 2750,
            "unit": "per_job"
          }
        ],
        "hallway": [
          {
            "jobType": "full_renovation",
            "supply": null,
            "price": 1850,
            "unit": "per_job"
          }
        ],
        "open_plan": [
          {
            "jobType": "full_renovation",
            "supply": null,
            "price": 8500,
            "unit": "per_job"
          }
        ]
      },
      "materialPackages": [
        {
          "label": "Kitchen cabinetry package",
          "price": 8950,
          "unit": "per_job"
        },
        {
          "label": "Material procurement",
          "price": 180,
          "unit": "per_job"
        }
      ],
      "removals": [
        {
          "removes": "bathroom_strip",
          "price": 1450
        },
        {
          "removes": "kitchen_strip",
          "price": 1650
        },
        {
          "removes": "laundry_strip",
          "price": 750
        },
        {
          "removes": "small_room",
          "price": 750
        },
        {
          "removes": "full_interior",
          "price": 4250
        }
      ],
      "extras": [
        {
          "type": "material_delivery",
          "label": "Standard material delivery",
          "price": 250,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "material_delivery",
          "label": "Large material delivery",
          "price": 450,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "waterproofing",
          "label": "Bathroom waterproofing",
          "price": 950,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "waterproofing",
          "label": "Ensuite waterproofing",
          "price": 850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "waterproofing",
          "label": "Laundry waterproofing",
          "price": 650,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "waterproofing",
          "label": "Shower waterproofing",
          "price": 550,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "tiling",
          "label": "Bathroom tiling labour",
          "price": 2450,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "tiling",
          "label": "Ensuite tiling",
          "price": 2150,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "tiling",
          "label": "Laundry tiling",
          "price": 1250,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "cabinetry",
          "label": "Kitchen cabinet installation",
          "price": 2850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "cabinetry",
          "label": "Laundry cabinet installation",
          "price": 1850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "benchtop",
          "label": "Kitchen benchtop installation",
          "price": 850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "benchtop",
          "label": "Laundry benchtop installation",
          "price": 650,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "benchtop",
          "label": "Laminate benchtop installation",
          "price": 850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "benchtop",
          "label": "Timber benchtop installation",
          "price": 1150,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "benchtop",
          "label": "Stone benchtop installation",
          "price": 1250,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "splashback",
          "label": "Kitchen splashback preparation",
          "price": 480,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "wardrobe",
          "label": "Built-in wardrobe installation",
          "price": 1850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "wardrobe",
          "label": "Walk-in wardrobe fit-out",
          "price": 3850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "cabinetry",
          "label": "Linen cabinet",
          "price": 850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "cabinetry",
          "label": "Storage cabinet",
          "price": 1250,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "wall_removal",
          "label": "Non-structural wall removal",
          "price": 850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "wall_removal",
          "label": "Structural wall removal",
          "price": 2850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "wall_build",
          "label": "Standard internal stud wall",
          "price": 1250,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "wall_build",
          "label": "Small partition wall",
          "price": 850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "wall_build",
          "label": "Large partition wall",
          "price": 1850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "wall_build",
          "label": "Door opening construction",
          "price": 650,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "wall_build",
          "label": "Framing modification",
          "price": 550,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "ceiling",
          "label": "Standard ceiling replacement",
          "price": 1850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "ceiling",
          "label": "Ceiling repair",
          "price": 650,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "ceiling",
          "label": "Bulkhead construction",
          "price": 950,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "painting",
          "label": "Standard room painting",
          "price": 1250,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "painting",
          "label": "Ceiling painting",
          "price": 650,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "painting",
          "label": "Wall painting",
          "price": 950,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "painting",
          "label": "Full interior repaint",
          "price": 6500,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "doors",
          "label": "Door frame installation",
          "price": 450,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "doors",
          "label": "Door hardware installation",
          "price": 95,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "doors",
          "label": "Sliding door installation",
          "price": 650,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "plastering",
          "label": "Cornice installation",
          "price": 55,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "skirting",
          "label": "Skirting installation",
          "price": 45,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "skirting",
          "label": "Skirting removal",
          "price": 18,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "architraves",
          "label": "Architrave installation",
          "price": 55,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "site_protection",
          "label": "Site protection",
          "price": 350,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "flooring",
          "label": "Floor preparation",
          "price": 650,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "flooring",
          "label": "Floor levelling",
          "price": 750,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "waste_disposal",
          "label": "General renovation waste",
          "price": 550,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "waste_disposal",
          "label": "Bathroom waste",
          "price": 650,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "waste_disposal",
          "label": "Kitchen waste",
          "price": 650,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "waste_disposal",
          "label": "Heavy construction waste",
          "price": 850,
          "unit": "per_job",
          "isFromPrice": false
        },
        {
          "type": "project_management",
          "label": "Project management on larger renovations",
          "price": 3500,
          "unit": "per_job",
          "isFromPrice": false
        }
      ],
      "surfaces": [
        {
          "label": "Standard wall plastering",
          "pricePerSqm": 65
        },
        {
          "label": "Ceiling plastering",
          "pricePerSqm": 75
        },
        {
          "label": "Plasterboard installation",
          "pricePerSqm": 85
        },
        {
          "label": "Floor tiling",
          "pricePerSqm": 75
        },
        {
          "label": "Wall tiling",
          "pricePerSqm": 78
        },
        {
          "label": "Large-format tile installation",
          "pricePerSqm": 105
        },
        {
          "label": "Mosaic installation",
          "pricePerSqm": 125
        },
        {
          "label": "Tile removal",
          "pricePerSqm": 45
        },
        {
          "label": "Adhesive removal",
          "pricePerSqm": 38
        },
        {
          "label": "Regrouting",
          "pricePerSqm": 55
        },
        {
          "label": "Laminate flooring",
          "pricePerSqm": 55
        },
        {
          "label": "Hybrid flooring",
          "pricePerSqm": 60
        },
        {
          "label": "Engineered timber",
          "pricePerSqm": 75
        },
        {
          "label": "Timber flooring",
          "pricePerSqm": 95
        },
        {
          "label": "Vinyl plank",
          "pricePerSqm": 50
        }
      ],
      "perItem": [
        {
          "label": "Internal door installation",
          "price": 280
        },
        {
          "label": "Door replacement",
          "price": 350
        },
        {
          "label": "Door painting",
          "price": 180
        },
        {
          "label": "Variation administration",
          "price": 75
        }
      ],
      "hourly": [
        {
          "label": "General carpentry",
          "price": 95,
          "unit": "per_hour"
        },
        {
          "label": "Finish carpentry",
          "price": 110,
          "unit": "per_hour"
        },
        {
          "label": "Custom timber work",
          "price": 125,
          "unit": "per_hour"
        },
        {
          "label": "Additional labour",
          "price": 95,
          "unit": "per_hour"
        },
        {
          "label": "Variation labour",
          "price": 110,
          "unit": "per_hour"
        }
      ],
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
      "minimumCharge": 450,
      "siteInspectionFee": 150,
      "consultationFee": 180,
      "travelFee": 95
    },
    "capabilities": {
      "businessName": "Berwick Home Renovations",
      "warranty": {
        "text": "Ten year workmanship warranty. Manufacturer warranties on supplied products are the maker's."
      },
      "tags": [],
      "inclusions": [],
      "exclusions": []
    },
    "ratesSaved": 13,
    "otherOfferings": [],
    "notUsed": [
      "Read by the offline mock reader - exclusions and other offerings are not extracted in mock mode."
    ],
    "alsoWorthAdding": [],
    "labels": {
      "any": "Yes, strip it out",
      "small_room": "A small room",
      "bathroom_strip": "An old bathroom",
      "kitchen_strip": "An old kitchen",
      "laundry_strip": "An old laundry",
      "full_interior": "The whole interior",
      "supply_and_install": "Supply and install",
      "labour_only": "Installation only",
      "structural_wall": "A wall that might be holding something up",
      "hidden_damage": "Water damage or rot I know about",
      "asbestos_suspected": "The house is old enough for asbestos",
      "restricted_access": "Hard to get to",
      "services_in_wall": "Pipes or wiring in the way",
      "uneven_floor": "Uneven floors",
      "waterproofing": "Waterproofing",
      "tiling": "Tiling",
      "flooring": "Flooring",
      "plastering": "Plastering",
      "painting": "Painting",
      "cabinetry": "Cabinetry",
      "benchtop": "A benchtop",
      "splashback": "A splashback",
      "doors": "Doors",
      "skirting": "Skirting boards",
      "architraves": "Architraves",
      "ceiling": "Ceiling work",
      "wall_removal": "Taking a wall out",
      "wall_build": "Building a new wall",
      "wardrobe": "A built-in wardrobe",
      "site_protection": "Protecting the rest of the house",
      "waste_disposal": "Taking the rubbish away",
      "material_delivery": "Material delivery",
      "project_management": "Managing the whole project",
      "full_renovation": "Full renovation",
      "demolition_only": "Demolition only",
      "fit_out_only": "Fit-out only",
      "repair": "Repair",
      "single_trade": "Single trade only",
      "kitchen": "Kitchen",
      "bathroom": "Bathroom",
      "ensuite": "Ensuite",
      "laundry": "Laundry",
      "bedroom": "Bedroom",
      "living_room": "Living room",
      "dining_room": "Dining room",
      "hallway": "Hallway",
      "home_office": "Home office",
      "open_plan": "Open plan",
      "whole_home": "Whole home",
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
          "chars": 5116,
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
    "rates": 13,
    "materialPackages": 2,
    "removals": 5,
    "extras": 50,
    "surfaces": 15,
    "perItem": 4,
    "hourly": 5,
    "tags": 0,
    "otherOfferings": 0,
    "couldNotUse": 1
  },
  "textChars": 5116
}
```
