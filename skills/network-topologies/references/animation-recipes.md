# Network Topology Animation Recipes

Complete animation patterns with full `add_keyframes_batch` JSON and `set_clip_range` for common network topology reveal sequences.

## 1. Core-Out Reveal

Core infrastructure appears first, then connections draw outward, finally endpoint devices reveal.

```json
{
  "set_clip_range": [0, 3500],
  "add_keyframes_batch": {
    "keyframes": [
      {
        "element_ids": ["central-switch", "central-switch-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 0, "value": 0},
          {"time": 500, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["arrow-1", "arrow-2", "arrow-3", "arrow-4", "arrow-5", "arrow-6"],
        "property": "strokeDasharray",
        "keyframes": [
          {"time": 500, "value": "5 5"},
          {"time": 2000, "value": "0 0", "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["arrow-1", "arrow-2", "arrow-3", "arrow-4", "arrow-5", "arrow-6"],
        "property": "opacity",
        "keyframes": [
          {"time": 500, "value": 0},
          {"time": 2000, "value": 1, "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["node-1", "node-1-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 2000, "value": 0},
          {"time": 2300, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["node-2", "node-2-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 2100, "value": 0},
          {"time": 2400, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["node-3", "node-3-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 2200, "value": 0},
          {"time": 2500, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["node-4", "node-4-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 2300, "value": 0},
          {"time": 2600, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["node-5", "node-5-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 2400, "value": 0},
          {"time": 2700, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["node-6", "node-6-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 2500, "value": 0},
          {"time": 2800, "value": 1, "easing": "easeOut"}
        ]
      }
    ]
  }
}
```

## 2. Connection Trace

Animate a specific network path: Client → Firewall → Load Balancer → Server → Database.

```json
{
  "set_clip_range": [0, 5000],
  "add_keyframes_batch": {
    "keyframes": [
      {
        "element_ids": ["internet", "internet-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 0, "value": 0},
          {"time": 400, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["arrow-internet-firewall"],
        "property": "strokeDasharray",
        "keyframes": [
          {"time": 400, "value": "10 10"},
          {"time": 1000, "value": "0 0", "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["arrow-internet-firewall"],
        "property": "opacity",
        "keyframes": [
          {"time": 400, "value": 0},
          {"time": 1000, "value": 1, "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["firewall", "firewall-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 1000, "value": 0},
          {"time": 1400, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["arrow-firewall-lb"],
        "property": "strokeDasharray",
        "keyframes": [
          {"time": 1400, "value": "10 10"},
          {"time": 2000, "value": "0 0", "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["arrow-firewall-lb"],
        "property": "opacity",
        "keyframes": [
          {"time": 1400, "value": 0},
          {"time": 2000, "value": 1, "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["load-balancer", "load-balancer-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 2000, "value": 0},
          {"time": 2400, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["arrow-lb-app2"],
        "property": "strokeDasharray",
        "keyframes": [
          {"time": 2400, "value": "10 10"},
          {"time": 3000, "value": "0 0", "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["arrow-lb-app2"],
        "property": "opacity",
        "keyframes": [
          {"time": 2400, "value": 0},
          {"time": 3000, "value": 1, "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["app-server-2", "app-server-2-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 3000, "value": 0},
          {"time": 3400, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["arrow-app2-db"],
        "property": "strokeDasharray",
        "keyframes": [
          {"time": 3400, "value": "10 10"},
          {"time": 4000, "value": "0 0", "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["arrow-app2-db"],
        "property": "opacity",
        "keyframes": [
          {"time": 3400, "value": 0},
          {"time": 4000, "value": 1, "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["database", "database-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 4000, "value": 0},
          {"time": 4400, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["arrow-internet-firewall", "arrow-firewall-lb", "arrow-lb-app2", "arrow-app2-db"],
        "property": "strokeColor",
        "keyframes": [
          {"time": 4400, "value": "#424242"},
          {"time": 4600, "value": "#4caf50"},
          {"time": 5000, "value": "#4caf50"}
        ]
      }
    ]
  }
}
```

## 3. Subnet-by-Subnet Reveal

Public subnet reveals first, then private subnet, then data layer with staggered element reveals.

```json
{
  "set_clip_range": [0, 4500],
  "add_keyframes_batch": {
    "keyframes": [
      {
        "element_ids": ["vpc-frame", "vpc-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 0, "value": 0},
          {"time": 300, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["public-subnet-frame", "public-subnet-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 300, "value": 0},
          {"time": 600, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["internet-gateway", "igw-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 700, "value": 0},
          {"time": 900, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["public-lb", "public-lb-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 900, "value": 0},
          {"time": 1100, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["nat-gateway", "nat-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 1100, "value": 0},
          {"time": 1300, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["connection-igw-lb"],
        "property": "opacity",
        "keyframes": [
          {"time": 1300, "value": 0},
          {"time": 1500, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["private-subnet-frame", "private-subnet-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 1500, "value": 0},
          {"time": 1800, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["app-server-1", "app-1-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 1900, "value": 0},
          {"time": 2200, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["app-server-2", "app-2-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 2100, "value": 0},
          {"time": 2400, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["app-server-3", "app-3-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 2300, "value": 0},
          {"time": 2600, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["connection-lb-app1", "connection-lb-app2", "connection-lb-app3"],
        "property": "strokeDasharray",
        "keyframes": [
          {"time": 2600, "value": "8 8"},
          {"time": 3000, "value": "0 0", "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["connection-lb-app1", "connection-lb-app2", "connection-lb-app3"],
        "property": "opacity",
        "keyframes": [
          {"time": 2600, "value": 0},
          {"time": 3000, "value": 1, "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["database", "database-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 3000, "value": 0},
          {"time": 3500, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["connection-app1-db"],
        "property": "strokeDasharray",
        "keyframes": [
          {"time": 3500, "value": "8 8"},
          {"time": 3800, "value": "0 0", "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["connection-app1-db"],
        "property": "opacity",
        "keyframes": [
          {"time": 3500, "value": 0},
          {"time": 3800, "value": 1, "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["connection-app2-db"],
        "property": "strokeDasharray",
        "keyframes": [
          {"time": 3600, "value": "8 8"},
          {"time": 3900, "value": "0 0", "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["connection-app2-db"],
        "property": "opacity",
        "keyframes": [
          {"time": 3600, "value": 0},
          {"time": 3900, "value": 1, "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["connection-app3-db"],
        "property": "strokeDasharray",
        "keyframes": [
          {"time": 3700, "value": "8 8"},
          {"time": 4000, "value": "0 0", "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["connection-app3-db"],
        "property": "opacity",
        "keyframes": [
          {"time": 3700, "value": 0},
          {"time": 4000, "value": 1, "easing": "easeInOut"}
        ]
      }
    ]
  }
}
```

## 4. Failover Animation

Primary path reveals normally, pauses, shows failure state, then backup path reveals.

```json
{
  "set_clip_range": [0, 6000],
  "add_keyframes_batch": {
    "keyframes": [
      {
        "element_ids": ["node-a", "node-a-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 0, "value": 0},
          {"time": 500, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["connection-a-b"],
        "property": "strokeDasharray",
        "keyframes": [
          {"time": 500, "value": "10 10"},
          {"time": 1200, "value": "0 0", "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["connection-a-b"],
        "property": "opacity",
        "keyframes": [
          {"time": 500, "value": 0},
          {"time": 1200, "value": 1, "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["node-b", "node-b-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 1200, "value": 0},
          {"time": 1700, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["connection-b-d"],
        "property": "strokeDasharray",
        "keyframes": [
          {"time": 1700, "value": "10 10"},
          {"time": 2400, "value": "0 0", "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["connection-b-d"],
        "property": "opacity",
        "keyframes": [
          {"time": 1700, "value": 0},
          {"time": 2400, "value": 1, "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["node-d", "node-d-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 2400, "value": 0},
          {"time": 2900, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["connection-a-b", "connection-b-d"],
        "property": "strokeColor",
        "keyframes": [
          {"time": 2900, "value": "#424242"},
          {"time": 3000, "value": "#4caf50"},
          {"time": 4000, "value": "#4caf50"},
          {"time": 4200, "value": "#f44336"}
        ]
      },
      {
        "element_ids": ["node-b"],
        "property": "backgroundColor",
        "keyframes": [
          {"time": 4000, "value": "#e8eaf6"},
          {"time": 4200, "value": "#ffebee"},
          {"time": 4400, "value": "#e8eaf6"},
          {"time": 4600, "value": "#ffebee"},
          {"time": 4800, "value": "#e8eaf6"}
        ]
      },
      {
        "element_ids": ["connection-a-d"],
        "property": "strokeColor",
        "keyframes": [
          {"time": 4000, "value": "#666666"},
          {"time": 4800, "value": "#4caf50"}
        ]
      },
      {
        "element_ids": ["connection-a-d"],
        "property": "strokeDasharray",
        "keyframes": [
          {"time": 4000, "value": "5 5"},
          {"time": 4800, "value": "10 10"},
          {"time": 5500, "value": "0 0", "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["connection-a-d"],
        "property": "opacity",
        "keyframes": [
          {"time": 4000, "value": 0.6},
          {"time": 4800, "value": 0},
          {"time": 5500, "value": 1, "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["connection-d-c", "connection-c-a"],
        "property": "strokeColor",
        "keyframes": [
          {"time": 5500, "value": "#424242"},
          {"time": 6000, "value": "#4caf50"}
        ]
      },
      {
        "element_ids": ["node-c", "node-c-label"],
        "property": "opacity",
        "keyframes": [
          {"time": 5200, "value": 0},
          {"time": 5700, "value": 1, "easing": "easeOut"}
        ]
      },
      {
        "element_ids": ["connection-d-c"],
        "property": "strokeDasharray",
        "keyframes": [
          {"time": 5200, "value": "10 10"},
          {"time": 5700, "value": "0 0", "easing": "easeInOut"}
        ]
      },
      {
        "element_ids": ["connection-d-c"],
        "property": "opacity",
        "keyframes": [
          {"time": 5200, "value": 0},
          {"time": 5700, "value": 1, "easing": "easeInOut"}
        ]
      }
    ]
  }
}
```