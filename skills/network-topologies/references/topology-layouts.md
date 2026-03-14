# Network Topology Layouts

Complete network topology layouts with exact coordinates and full `create_scene` JSON for common network architectures.

## 1. Star Topology

Central switch/router with 6 nodes arranged in a circle around it.

```json
{
  "create_scene": {
    "elements": [
      {
        "id": "central-switch",
        "type": "rectangle",
        "x": 660,
        "y": 360,
        "width": 80,
        "height": 80,
        "backgroundColor": "#e1f5fe",
        "strokeColor": "#0277bd",
        "strokeWidth": 2
      },
      {
        "id": "central-switch-label",
        "type": "text",
        "x": 700,
        "y": 400,
        "text": "Switch",
        "fontSize": 14,
        "textAlign": "center"
      },
      {
        "id": "node-1",
        "type": "ellipse",
        "x": 660,
        "y": 60,
        "width": 80,
        "height": 80,
        "backgroundColor": "#f3e5f5",
        "strokeColor": "#7b1fa2",
        "strokeWidth": 2
      },
      {
        "id": "node-1-label",
        "type": "text",
        "x": 700,
        "y": 100,
        "text": "PC-1",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "node-2",
        "type": "ellipse",
        "x": 920,
        "y": 210,
        "width": 80,
        "height": 80,
        "backgroundColor": "#f3e5f5",
        "strokeColor": "#7b1fa2",
        "strokeWidth": 2
      },
      {
        "id": "node-2-label",
        "type": "text",
        "x": 960,
        "y": 250,
        "text": "PC-2",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "node-3",
        "type": "ellipse",
        "x": 920,
        "y": 510,
        "width": 80,
        "height": 80,
        "backgroundColor": "#f3e5f5",
        "strokeColor": "#7b1fa2",
        "strokeWidth": 2
      },
      {
        "id": "node-3-label",
        "type": "text",
        "x": 960,
        "y": 550,
        "text": "PC-3",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "node-4",
        "type": "ellipse",
        "x": 660,
        "y": 660,
        "width": 80,
        "height": 80,
        "backgroundColor": "#f3e5f5",
        "strokeColor": "#7b1fa2",
        "strokeWidth": 2
      },
      {
        "id": "node-4-label",
        "type": "text",
        "x": 700,
        "y": 700,
        "text": "PC-4",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "node-5",
        "type": "ellipse",
        "x": 400,
        "y": 510,
        "width": 80,
        "height": 80,
        "backgroundColor": "#f3e5f5",
        "strokeColor": "#7b1fa2",
        "strokeWidth": 2
      },
      {
        "id": "node-5-label",
        "type": "text",
        "x": 440,
        "y": 550,
        "text": "PC-5",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "node-6",
        "type": "ellipse",
        "x": 400,
        "y": 210,
        "width": 80,
        "height": 80,
        "backgroundColor": "#f3e5f5",
        "strokeColor": "#7b1fa2",
        "strokeWidth": 2
      },
      {
        "id": "node-6-label",
        "type": "text",
        "x": 440,
        "y": 250,
        "text": "PC-6",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "arrow-1",
        "type": "arrow",
        "x": 700,
        "y": 140,
        "width": 0,
        "height": 220,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "arrow-2",
        "type": "arrow",
        "x": 840,
        "y": 250,
        "width": -80,
        "height": 110,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "arrow-3",
        "type": "arrow",
        "x": 840,
        "y": 550,
        "width": -80,
        "height": -110,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "arrow-4",
        "type": "arrow",
        "x": 700,
        "y": 660,
        "width": 0,
        "height": -220,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "arrow-5",
        "type": "arrow",
        "x": 560,
        "y": 550,
        "width": 80,
        "height": -110,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "arrow-6",
        "type": "arrow",
        "x": 560,
        "y": 250,
        "width": 80,
        "height": 110,
        "strokeColor": "#424242",
        "strokeWidth": 2
      }
    ]
  }
}
```

## 2. 3-Tier Hierarchical

Internet → Firewall → Load Balancer → App Servers → Database

```json
{
  "create_scene": {
    "elements": [
      {
        "id": "internet",
        "type": "ellipse",
        "x": 660,
        "y": 10,
        "width": 80,
        "height": 80,
        "backgroundColor": "#e8f5e8",
        "strokeColor": "#2e7d32",
        "strokeWidth": 2
      },
      {
        "id": "internet-label",
        "type": "text",
        "x": 700,
        "y": 50,
        "text": "Internet",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "firewall",
        "type": "rectangle",
        "x": 660,
        "y": 160,
        "width": 80,
        "height": 80,
        "backgroundColor": "#ffebee",
        "strokeColor": "#c62828",
        "strokeWidth": 2
      },
      {
        "id": "firewall-label",
        "type": "text",
        "x": 700,
        "y": 200,
        "text": "Firewall",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "load-balancer",
        "type": "diamond",
        "x": 660,
        "y": 310,
        "width": 80,
        "height": 80,
        "backgroundColor": "#fff3e0",
        "strokeColor": "#ef6c00",
        "strokeWidth": 2
      },
      {
        "id": "load-balancer-label",
        "type": "text",
        "x": 700,
        "y": 350,
        "text": "Load\nBalancer",
        "fontSize": 11,
        "textAlign": "center"
      },
      {
        "id": "app-server-1",
        "type": "rectangle",
        "x": 410,
        "y": 460,
        "width": 80,
        "height": 80,
        "backgroundColor": "#e3f2fd",
        "strokeColor": "#1565c0",
        "strokeWidth": 2
      },
      {
        "id": "app-server-1-label",
        "type": "text",
        "x": 450,
        "y": 500,
        "text": "App\nServer 1",
        "fontSize": 11,
        "textAlign": "center"
      },
      {
        "id": "app-server-2",
        "type": "rectangle",
        "x": 660,
        "y": 460,
        "width": 80,
        "height": 80,
        "backgroundColor": "#e3f2fd",
        "strokeColor": "#1565c0",
        "strokeWidth": 2
      },
      {
        "id": "app-server-2-label",
        "type": "text",
        "x": 700,
        "y": 500,
        "text": "App\nServer 2",
        "fontSize": 11,
        "textAlign": "center"
      },
      {
        "id": "app-server-3",
        "type": "rectangle",
        "x": 910,
        "y": 460,
        "width": 80,
        "height": 80,
        "backgroundColor": "#e3f2fd",
        "strokeColor": "#1565c0",
        "strokeWidth": 2
      },
      {
        "id": "app-server-3-label",
        "type": "text",
        "x": 950,
        "y": 500,
        "text": "App\nServer 3",
        "fontSize": 11,
        "textAlign": "center"
      },
      {
        "id": "database",
        "type": "ellipse",
        "x": 660,
        "y": 610,
        "width": 80,
        "height": 80,
        "backgroundColor": "#f1f8e9",
        "strokeColor": "#558b2f",
        "strokeWidth": 2
      },
      {
        "id": "database-label",
        "type": "text",
        "x": 700,
        "y": 650,
        "text": "Database",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "arrow-internet-firewall",
        "type": "arrow",
        "x": 700,
        "y": 90,
        "width": 0,
        "height": 70,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "arrow-firewall-lb",
        "type": "arrow",
        "x": 700,
        "y": 240,
        "width": 0,
        "height": 70,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "arrow-lb-app1",
        "type": "arrow",
        "x": 670,
        "y": 390,
        "width": -170,
        "height": 70,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "arrow-lb-app2",
        "type": "arrow",
        "x": 700,
        "y": 390,
        "width": 0,
        "height": 70,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "arrow-lb-app3",
        "type": "arrow",
        "x": 730,
        "y": 390,
        "width": 170,
        "height": 70,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "arrow-app1-db",
        "type": "arrow",
        "x": 500,
        "y": 540,
        "width": 170,
        "height": 70,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "arrow-app2-db",
        "type": "arrow",
        "x": 700,
        "y": 540,
        "width": 0,
        "height": 70,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "arrow-app3-db",
        "type": "arrow",
        "x": 900,
        "y": 540,
        "width": -170,
        "height": 70,
        "strokeColor": "#424242",
        "strokeWidth": 2
      }
    ]
  }
}
```

## 3. Mesh/Redundant Network

4 nodes in a square with redundant cross-connections between all pairs.

```json
{
  "create_scene": {
    "elements": [
      {
        "id": "node-a",
        "type": "rectangle",
        "x": 260,
        "y": 160,
        "width": 80,
        "height": 80,
        "backgroundColor": "#e8eaf6",
        "strokeColor": "#3f51b5",
        "strokeWidth": 2
      },
      {
        "id": "node-a-label",
        "type": "text",
        "x": 300,
        "y": 200,
        "text": "Node A",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "node-b",
        "type": "rectangle",
        "x": 860,
        "y": 160,
        "width": 80,
        "height": 80,
        "backgroundColor": "#e8eaf6",
        "strokeColor": "#3f51b5",
        "strokeWidth": 2
      },
      {
        "id": "node-b-label",
        "type": "text",
        "x": 900,
        "y": 200,
        "text": "Node B",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "node-c",
        "type": "rectangle",
        "x": 260,
        "y": 460,
        "width": 80,
        "height": 80,
        "backgroundColor": "#e8eaf6",
        "strokeColor": "#3f51b5",
        "strokeWidth": 2
      },
      {
        "id": "node-c-label",
        "type": "text",
        "x": 300,
        "y": 500,
        "text": "Node C",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "node-d",
        "type": "rectangle",
        "x": 860,
        "y": 460,
        "width": 80,
        "height": 80,
        "backgroundColor": "#e8eaf6",
        "strokeColor": "#3f51b5",
        "strokeWidth": 2
      },
      {
        "id": "node-d-label",
        "type": "text",
        "x": 900,
        "y": 500,
        "text": "Node D",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "connection-a-b",
        "type": "line",
        "x": 340,
        "y": 200,
        "width": 520,
        "height": 0,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "connection-b-d",
        "type": "line",
        "x": 900,
        "y": 240,
        "width": 0,
        "height": 220,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "connection-d-c",
        "type": "line",
        "x": 860,
        "y": 500,
        "width": -520,
        "height": 0,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "connection-c-a",
        "type": "line",
        "x": 300,
        "y": 460,
        "width": 0,
        "height": -220,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "connection-a-d",
        "type": "line",
        "x": 340,
        "y": 240,
        "width": 520,
        "height": 220,
        "strokeColor": "#666666",
        "strokeWidth": 2,
        "strokeStyle": "dashed"
      },
      {
        "id": "connection-b-c",
        "type": "line",
        "x": 860,
        "y": 240,
        "width": -520,
        "height": 220,
        "strokeColor": "#666666",
        "strokeWidth": 2,
        "strokeStyle": "dashed"
      }
    ]
  }
}
```

## 4. Cloud VPC Architecture

Frame-based VPC with public and private subnets.

```json
{
  "create_scene": {
    "elements": [
      {
        "id": "vpc-frame",
        "type": "rectangle",
        "x": 150,
        "y": 50,
        "width": 900,
        "height": 600,
        "backgroundColor": "#f5f5f5",
        "strokeColor": "#424242",
        "strokeWidth": 3,
        "strokeStyle": "dashed",
        "fillStyle": "hachure"
      },
      {
        "id": "vpc-label",
        "type": "text",
        "x": 200,
        "y": 80,
        "text": "VPC (10.0.0.0/16)",
        "fontSize": 16,
        "fontWeight": "bold"
      },
      {
        "id": "public-subnet-frame",
        "type": "rectangle",
        "x": 200,
        "y": 120,
        "width": 800,
        "height": 200,
        "backgroundColor": "#e8f5e8",
        "strokeColor": "#2e7d32",
        "strokeWidth": 2,
        "strokeStyle": "dashed",
        "fillStyle": "hachure"
      },
      {
        "id": "public-subnet-label",
        "type": "text",
        "x": 220,
        "y": 150,
        "text": "Public Subnet (10.0.1.0/24)",
        "fontSize": 14,
        "fontWeight": "bold"
      },
      {
        "id": "internet-gateway",
        "type": "diamond",
        "x": 260,
        "y": 180,
        "width": 80,
        "height": 60,
        "backgroundColor": "#fff3e0",
        "strokeColor": "#ef6c00",
        "strokeWidth": 2
      },
      {
        "id": "igw-label",
        "type": "text",
        "x": 300,
        "y": 210,
        "text": "IGW",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "public-lb",
        "type": "rectangle",
        "x": 460,
        "y": 180,
        "width": 120,
        "height": 60,
        "backgroundColor": "#fff3e0",
        "strokeColor": "#ef6c00",
        "strokeWidth": 2
      },
      {
        "id": "public-lb-label",
        "type": "text",
        "x": 520,
        "y": 210,
        "text": "Load Balancer",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "nat-gateway",
        "type": "rectangle",
        "x": 760,
        "y": 180,
        "width": 80,
        "height": 60,
        "backgroundColor": "#e3f2fd",
        "strokeColor": "#1565c0",
        "strokeWidth": 2
      },
      {
        "id": "nat-label",
        "type": "text",
        "x": 800,
        "y": 210,
        "text": "NAT GW",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "private-subnet-frame",
        "type": "rectangle",
        "x": 200,
        "y": 360,
        "width": 800,
        "height": 200,
        "backgroundColor": "#ffebee",
        "strokeColor": "#c62828",
        "strokeWidth": 2,
        "strokeStyle": "dashed",
        "fillStyle": "hachure"
      },
      {
        "id": "private-subnet-label",
        "type": "text",
        "x": 220,
        "y": 390,
        "text": "Private Subnet (10.0.2.0/24)",
        "fontSize": 14,
        "fontWeight": "bold"
      },
      {
        "id": "app-server-1",
        "type": "rectangle",
        "x": 280,
        "y": 420,
        "width": 80,
        "height": 60,
        "backgroundColor": "#e3f2fd",
        "strokeColor": "#1565c0",
        "strokeWidth": 2
      },
      {
        "id": "app-1-label",
        "type": "text",
        "x": 320,
        "y": 450,
        "text": "App 1",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "app-server-2",
        "type": "rectangle",
        "x": 480,
        "y": 420,
        "width": 80,
        "height": 60,
        "backgroundColor": "#e3f2fd",
        "strokeColor": "#1565c0",
        "strokeWidth": 2
      },
      {
        "id": "app-2-label",
        "type": "text",
        "x": 520,
        "y": 450,
        "text": "App 2",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "app-server-3",
        "type": "rectangle",
        "x": 680,
        "y": 420,
        "width": 80,
        "height": 60,
        "backgroundColor": "#e3f2fd",
        "strokeColor": "#1565c0",
        "strokeWidth": 2
      },
      {
        "id": "app-3-label",
        "type": "text",
        "x": 720,
        "y": 450,
        "text": "App 3",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "database",
        "type": "ellipse",
        "x": 480,
        "y": 570,
        "width": 120,
        "height": 60,
        "backgroundColor": "#f1f8e9",
        "strokeColor": "#558b2f",
        "strokeWidth": 2
      },
      {
        "id": "database-label",
        "type": "text",
        "x": 540,
        "y": 600,
        "text": "Database",
        "fontSize": 12,
        "textAlign": "center"
      },
      {
        "id": "connection-igw-lb",
        "type": "line",
        "x": 340,
        "y": 210,
        "width": 120,
        "height": 0,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "connection-lb-app1",
        "type": "line",
        "x": 500,
        "y": 240,
        "width": -160,
        "height": 180,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "connection-lb-app2",
        "type": "line",
        "x": 520,
        "y": 240,
        "width": 0,
        "height": 180,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "connection-lb-app3",
        "type": "line",
        "x": 540,
        "y": 240,
        "width": 140,
        "height": 180,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "connection-app1-db",
        "type": "line",
        "x": 360,
        "y": 480,
        "width": 120,
        "height": 90,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "connection-app2-db",
        "type": "line",
        "x": 520,
        "y": 480,
        "width": 0,
        "height": 90,
        "strokeColor": "#424242",
        "strokeWidth": 2
      },
      {
        "id": "connection-app3-db",
        "type": "line",
        "x": 720,
        "y": 480,
        "width": -140,
        "height": 90,
        "strokeColor": "#424242",
        "strokeWidth": 2
      }
    ]
  }
}
```