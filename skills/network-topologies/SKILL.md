---
name: network-topologies
description: >
  Create animated network topology and infrastructure diagrams using the Excalimate
  MCP server. Use when asked to visualize network architecture, server infrastructure,
  cloud deployments, Kubernetes clusters, VPC layouts, firewall rules, load balancing,
  or any physical/logical network topology.
---

# Network Topologies Agent Skill

Expert agent for creating animated network topology and infrastructure diagrams using the Excalimate MCP server. Specializes in visualizing complex network architectures with proper component placement, connection flows, and progressive reveal animations.

## Core Workflow

1. **Analyze Requirements**: Identify network components (servers, clients, routers), connection types (data flows, management), and logical groupings (subnets, zones)
2. **Choose Topology Pattern**: Select appropriate layout (star, hierarchical, mesh, cloud VPC) based on architecture
3. **Layout Design**: Position core infrastructure centrally, group related components, establish clear traffic flow paths
4. **Animate Systematically**: Core infrastructure first → connections draw outward → endpoints reveal → optional traffic flows

## Network Components

All components use consistent sizing and colors. Each includes a boundElement for labeling:

### Infrastructure Components
- **Server**: Blue rectangle (160×70px) `#1971c2` fill, `#1864ab` stroke
- **Web Server**: Blue rectangle with "WEB" label
- **App Server**: Blue rectangle with "APP" label  
- **Database Server**: Green rectangle (160×70px) `#2f9e44` fill, `#2b8a3e` stroke
- **Load Balancer**: Purple ellipse (130×60px) `#7c2d8e` fill, `#6c2975` stroke

### Network Equipment
- **Router/Switch**: Teal diamond (120×100px) `#0c8599` fill, `#087f8c` stroke
- **Firewall**: Red rectangle (160×70px) `#e03131` fill, `#c92a2a` stroke, dashed strokeStyle
- **VPN Gateway**: Orange rectangle (140×60px) `#fd7e14` fill, `#e8590c` stroke

### Client Devices
- **Client/Desktop**: Yellow rectangle (120×60px) `#fab005` fill, `#f59f00` stroke
- **Mobile Device**: Smaller yellow rectangle (80×120px)
- **Laptop**: Yellow rectangle (140×80px)

### Cloud Components
- **Cloud Gateway**: Gray rounded rectangle (150×80px) `#868e96` fill
- **CDN**: Purple rounded rectangle (120×60px) `#9775fa` fill
- **DNS**: Green ellipse (100×60px) `#51cf66` fill

## Subnet Grouping with Frames

Use frame elements to represent network boundaries:

- **Public Subnet**: Frame with `#a5d8ff` background, `#339af0` stroke, "Public Subnet" label
- **Private Subnet**: Frame with `#b2f2bb` background, `#51cf66` stroke, "Private Subnet" label  
- **DMZ**: Frame with `#ffec99` background, `#ffd43b` stroke, "DMZ" label
- **Management Network**: Frame with `#d0bfff` background, `#9775fa` stroke

## Connection Types

- **Data Flow**: Solid arrows with `#495057` stroke, arrowheads indicate direction
- **Management/Control**: Dashed lines `[5, 5]` strokeDasharray  
- **Backup/Redundant**: Dotted lines `[2, 3]` strokeDasharray
- **Bidirectional**: Both start and end arrowheads
- **High-bandwidth**: Thicker stroke (3px) with `#1971c2` color

## Layout Principles

### Vertical Hierarchy (Top to Bottom)
1. **Internet/External** (y: 100-200)
2. **Edge/DMZ** (y: 300-400) - Firewalls, Load Balancers, CDN
3. **Application Layer** (y: 500-600) - Web/App Servers
4. **Data Layer** (y: 700-800) - Databases, Storage

### Horizontal Organization
- Core devices centered (x: 400-600)
- Redundant components side-by-side
- Client devices fanned out
- Management components on edges

## Animation Patterns

### 1. Core-Out Infrastructure Reveal
```javascript
// Core infrastructure appears first (0-800ms)
{ elementId: 'firewall1', property: 'opacity', keyframes: [{time: 0, value: 0}, {time: 800, value: 1}] }
{ elementId: 'loadbalancer1', property: 'opacity', keyframes: [{time: 400, value: 0}, {time: 1200, value: 1}] }

// Connections draw outward (800-2500ms)  
{ elementId: 'connection1', property: 'strokeDashoffset', keyframes: [{time: 800, value: 100}, {time: 2000, value: 0}] }

// Endpoints reveal (2500ms+)
{ elementId: 'server1', property: 'opacity', keyframes: [{time: 2500, value: 0}, {time: 3000, value: 1}] }
```

### 2. Subnet-by-Subnet Reveal
- Public subnet components (0-1500ms)
- DMZ components (1000-2500ms) 
- Private subnet components (2000-3500ms)
- Data layer components (3000-4500ms)

### 3. Traffic Flow Animation
```javascript
// Animated traffic dots along connection paths
{ elementId: 'trafficDot1', property: 'cx', keyframes: [{time: 0, value: 200}, {time: 2000, value: 600}] }
{ elementId: 'trafficDot1', property: 'cy', keyframes: [{time: 0, value: 300}, {time: 2000, value: 500}] }
```

## Complete Example: 3-Tier Web Architecture

```json
{
  "scene": {
    "elements": [
      {
        "id": "internet", "type": "ellipse", "x": 400, "y": 100, "width": 120, "height": 60,
        "fillStyle": "solid", "backgroundColor": "#e9ecef", "strokeColor": "#6c757d",
        "boundElements": [{"id": "internet_label", "type": "text"}]
      },
      {
        "id": "internet_label", "type": "text", "x": 420, "y": 125, "width": 80, "height": 20,
        "text": "Internet", "fontSize": 16, "textAlign": "center", "containerId": "internet"
      },
      {
        "id": "firewall1", "type": "rectangle", "x": 350, "y": 250, "width": 100, "height": 60,
        "fillStyle": "solid", "backgroundColor": "#ffdedb", "strokeColor": "#e03131", 
        "strokeStyle": "dashed", "boundElements": [{"id": "fw_label", "type": "text"}]
      },
      {
        "id": "fw_label", "type": "text", "x": 370, "y": 275, "width": 60, "height": 20,
        "text": "Firewall", "fontSize": 14, "textAlign": "center", "containerId": "firewall1"
      },
      {
        "id": "loadbalancer1", "type": "ellipse", "x": 335, "y": 400, "width": 130, "height": 60,
        "fillStyle": "solid", "backgroundColor": "#e5dbff", "strokeColor": "#7c2d8e",
        "boundElements": [{"id": "lb_label", "type": "text"}]
      },
      {
        "id": "lb_label", "type": "text", "x": 365, "y": 425, "width": 70, "height": 20,
        "text": "Load Balancer", "fontSize": 12, "textAlign": "center", "containerId": "loadbalancer1"
      },
      {
        "id": "webserver1", "type": "rectangle", "x": 200, "y": 550, "width": 120, "height": 60,
        "fillStyle": "solid", "backgroundColor": "#d0ebff", "strokeColor": "#1971c2",
        "boundElements": [{"id": "web1_label", "type": "text"}]
      },
      {
        "id": "web1_label", "type": "text", "x": 230, "y": 575, "width": 60, "height": 20,
        "text": "Web Server 1", "fontSize": 12, "textAlign": "center", "containerId": "webserver1"
      },
      {
        "id": "webserver2", "type": "rectangle", "x": 360, "y": 550, "width": 120, "height": 60,
        "fillStyle": "solid", "backgroundColor": "#d0ebff", "strokeColor": "#1971c2",
        "boundElements": [{"id": "web2_label", "type": "text"}]
      },
      {
        "id": "web2_label", "type": "text", "x": 390, "y": 575, "width": 60, "height": 20,
        "text": "Web Server 2", "fontSize": 12, "textAlign": "center", "containerId": "webserver2"
      },
      {
        "id": "webserver3", "type": "rectangle", "x": 520, "y": 550, "width": 120, "height": 60,
        "fillStyle": "solid", "backgroundColor": "#d0ebff", "strokeColor": "#1971c2",
        "boundElements": [{"id": "web3_label", "type": "text"}]
      },
      {
        "id": "web3_label", "type": "text", "x": 550, "y": 575, "width": 60, "height": 20,
        "text": "Web Server 3", "fontSize": 12, "textAlign": "center", "containerId": "webserver3"
      },
      {
        "id": "database1", "type": "rectangle", "x": 360, "y": 700, "width": 120, "height": 60,
        "fillStyle": "solid", "backgroundColor": "#c8f7c5", "strokeColor": "#2f9e44",
        "boundElements": [{"id": "db_label", "type": "text"}]
      },
      {
        "id": "db_label", "type": "text", "x": 390, "y": 725, "width": 60, "height": 20,
        "text": "Database", "fontSize": 14, "textAlign": "center", "containerId": "database1"
      },
      {
        "id": "conn_inet_fw", "type": "arrow", "x": 400, "y": 160, "width": 0, "height": 90,
        "points": [[0, 0], [0, 90]], "endArrowhead": "arrow", "strokeColor": "#495057"
      },
      {
        "id": "conn_fw_lb", "type": "arrow", "x": 400, "y": 310, "width": 0, "height": 90,
        "points": [[0, 0], [0, 90]], "endArrowhead": "arrow", "strokeColor": "#495057"
      },
      {
        "id": "conn_lb_web1", "type": "arrow", "x": 370, "y": 460, "width": -110, "height": 90,
        "points": [[0, 0], [-110, 90]], "endArrowhead": "arrow", "strokeColor": "#495057"
      },
      {
        "id": "conn_lb_web2", "type": "arrow", "x": 400, "y": 460, "width": 20, "height": 90,
        "points": [[0, 0], [20, 90]], "endArrowhead": "arrow", "strokeColor": "#495057"
      },
      {
        "id": "conn_lb_web3", "type": "arrow", "x": 430, "y": 460, "width": 150, "height": 90,
        "points": [[0, 0], [150, 90]], "endArrowhead": "arrow", "strokeColor": "#495057"
      },
      {
        "id": "conn_web1_db", "type": "arrow", "x": 260, "y": 610, "width": 160, "height": 90,
        "points": [[0, 0], [160, 90]], "endArrowhead": "arrow", "strokeColor": "#495057"
      },
      {
        "id": "conn_web2_db", "type": "arrow", "x": 420, "y": 610, "width": 0, "height": 90,
        "points": [[0, 0], [0, 90]], "endArrowhead": "arrow", "strokeColor": "#495057"
      },
      {
        "id": "conn_web3_db", "type": "arrow", "x": 580, "y": 610, "width": -160, "height": 90,
        "points": [[0, 0], [-160, 90]], "endArrowhead": "arrow", "strokeColor": "#495057"
      }
    ]
  },
  "animations": [
    {"elementId": "firewall1", "property": "opacity", "keyframes": [{"time": 0, "value": 0}, {"time": 800, "value": 1}]},
    {"elementId": "fw_label", "property": "opacity", "keyframes": [{"time": 0, "value": 0}, {"time": 800, "value": 1}]},
    {"elementId": "loadbalancer1", "property": "opacity", "keyframes": [{"time": 400, "value": 0}, {"time": 1200, "value": 1}]},
    {"elementId": "lb_label", "property": "opacity", "keyframes": [{"time": 400, "value": 0}, {"time": 1200, "value": 1}]},
    {"elementId": "conn_inet_fw", "property": "opacity", "keyframes": [{"time": 800, "value": 0}, {"time": 1600, "value": 1}]},
    {"elementId": "conn_fw_lb", "property": "opacity", "keyframes": [{"time": 1200, "value": 0}, {"time": 2000, "value": 1}]},
    {"elementId": "webserver1", "property": "opacity", "keyframes": [{"time": 2000, "value": 0}, {"time": 2800, "value": 1}]},
    {"elementId": "web1_label", "property": "opacity", "keyframes": [{"time": 2000, "value": 0}, {"time": 2800, "value": 1}]},
    {"elementId": "webserver2", "property": "opacity", "keyframes": [{"time": 2200, "value": 0}, {"time": 3000, "value": 1}]},
    {"elementId": "web2_label", "property": "opacity", "keyframes": [{"time": 2200, "value": 0}, {"time": 3000, "value": 1}]},
    {"elementId": "webserver3", "property": "opacity", "keyframes": [{"time": 2400, "value": 0}, {"time": 3200, "value": 1}]},
    {"elementId": "web3_label", "property": "opacity", "keyframes": [{"time": 2400, "value": 0}, {"time": 3200, "value": 1}]},
    {"elementId": "conn_lb_web1", "property": "opacity", "keyframes": [{"time": 2800, "value": 0}, {"time": 3600, "value": 1}]},
    {"elementId": "conn_lb_web2", "property": "opacity", "keyframes": [{"time": 3000, "value": 0}, {"time": 3800, "value": 1}]},
    {"elementId": "conn_lb_web3", "property": "opacity", "keyframes": [{"time": 3200, "value": 0}, {"time": 4000, "value": 1}]},
    {"elementId": "database1", "property": "opacity", "keyframes": [{"time": 4000, "value": 0}, {"time": 4800, "value": 1}]},
    {"elementId": "db_label", "property": "opacity", "keyframes": [{"time": 4000, "value": 0}, {"time": 4800, "value": 1}]},
    {"elementId": "conn_web1_db", "property": "opacity", "keyframes": [{"time": 4800, "value": 0}, {"time": 5600, "value": 1}]},
    {"elementId": "conn_web2_db", "property": "opacity", "keyframes": [{"time": 5000, "value": 0}, {"time": 5800, "value": 1}]},
    {"elementId": "conn_web3_db", "property": "opacity", "keyframes": [{"time": 5200, "value": 0}, {"time": 6000, "value": 1}]}
  ]
}
```

## Best Practices

1. **Clear Hierarchy**: Use consistent Y-coordinates for each network tier
2. **Logical Grouping**: Frame related components with appropriate subnet colors
3. **Progressive Animation**: Core infrastructure → connections → endpoints
4. **Consistent Styling**: Use component library colors and sizes
5. **Label Everything**: Include text labels for all network components
6. **Show Traffic Flow**: Use arrows to indicate data direction and flow patterns