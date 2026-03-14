---
name: architecture-diagrams
description: >
  Create professional software architecture diagrams with animated reveals using
  the Excalimate MCP server. Use when asked to visualize system architecture,
  microservices, cloud infrastructure, API gateways, service meshes, layered
  architectures, or any system design — even if the user doesn't explicitly say
  "architecture diagram."
---

# Architecture Diagrams Skill

Create professional animated software architecture diagrams using the Excalimate MCP server.

## Workflow

1. **Identify Components**: Determine system elements (services, databases, clients, queues, etc.)
2. **Choose Layout Pattern**: Select from 3-tier, microservices, event-driven, or hexagonal
3. **Create Scene**: Use `create_scene` with components positioned on 250×180px grid
4. **Animate Layer-by-Layer**: Reveal architecture progressively with `add_keyframes_batch`
5. **Set Camera & Clip**: Position camera and set clip range for optimal viewing

## Component Vocabulary

Use these standard components with consistent styling and bound labels:

- **Service Box**: `{"type":"rectangle","width":180,"height":80,"backgroundColor":"#a5d8ff","strokeColor":"#1971c2"}`
- **Database**: `{"type":"rectangle","width":140,"height":70,"backgroundColor":"#b2f2bb","strokeColor":"#2f9e44"}`
- **Message Queue**: `{"type":"rectangle","width":200,"height":60,"backgroundColor":"#ffd8a8","strokeColor":"#f08c00"}`
- **Load Balancer**: `{"type":"diamond","width":120,"height":100,"backgroundColor":"#99e9f2","strokeColor":"#0c8599"}`
- **Client**: `{"type":"rectangle","width":120,"height":70,"backgroundColor":"#ffec99","strokeColor":"#f08c00"}`
- **Cache**: `{"type":"ellipse","width":130,"height":80,"backgroundColor":"#d0bfff","strokeColor":"#6741d9"}`
- **API Gateway**: `{"type":"rectangle","width":180,"height":80,"backgroundColor":"#99e9f2","strokeColor":"#0c8599"}`

All components include `"boundElements":[{"id":"label_id","type":"text"}]` for labels.

## Layout Grid

- **Horizontal spacing**: 250px between component centers
- **Vertical spacing**: 180px between layer centers  
- **Boundary frames**: Use rectangles with transparent fill for system boundaries
- **Canvas size**: 1600×1200px recommended for complex architectures

## Color Coding

| Layer Type | Background | Border | Usage |
|------------|------------|--------|--------|
| Client | #ffec99 | #f08c00 | Users, frontend apps, mobile |
| API | #99e9f2 | #0c8599 | Gateways, load balancers, proxies |
| Services | #a5d8ff | #1971c2 | Business logic, microservices |
| Data | #b2f2bb | #2f9e44 | Databases, storage, caches |
| External | #d0bfff | #6741d9 | Third-party services, external APIs |

## Animation Timing

Standard layer-by-layer reveal pattern:

1. **L1 Components** fade in: 0-500ms
2. **L1→L2 Arrows** draw on: 500-1500ms  
3. **L2 Components** fade in: 1500-2000ms
4. **L2→L3 Arrows** draw on: 2000-3000ms
5. **L3 Components** staggered: 3000-4500ms
6. **L4 Components** fade in: 5500-6000ms

**Clip Range**: 0-7000ms for complete reveal

## Complete Example: 3-Tier Architecture

```json
// create_scene call
{
  "elements": [
    {
      "id": "client",
      "type": "rectangle", 
      "x": 400, "y": 100,
      "width": 120, "height": 70,
      "backgroundColor": "#ffec99",
      "strokeColor": "#f08c00",
      "boundElements": [{"id": "client_label", "type": "text"}]
    },
    {
      "id": "client_label",
      "type": "text",
      "x": 460, "y": 135,
      "text": "Client App",
      "fontSize": 16
    },
    {
      "id": "gateway",
      "type": "rectangle",
      "x": 400, "y": 280, 
      "width": 180, "height": 80,
      "backgroundColor": "#99e9f2",
      "strokeColor": "#0c8599",
      "boundElements": [{"id": "gateway_label", "type": "text"}]
    },
    {
      "id": "gateway_label", 
      "type": "text",
      "x": 490, "y": 320,
      "text": "API Gateway",
      "fontSize": 16
    },
    {
      "id": "service1",
      "type": "rectangle",
      "x": 250, "y": 460,
      "width": 180, "height": 80, 
      "backgroundColor": "#a5d8ff",
      "strokeColor": "#1971c2",
      "boundElements": [{"id": "service1_label", "type": "text"}]
    },
    {
      "id": "service1_label",
      "type": "text", 
      "x": 340, "y": 500,
      "text": "User Service",
      "fontSize": 16
    },
    {
      "id": "service2",
      "type": "rectangle",
      "x": 500, "y": 460,
      "width": 180, "height": 80,
      "backgroundColor": "#a5d8ff", 
      "strokeColor": "#1971c2",
      "boundElements": [{"id": "service2_label", "type": "text"}]
    },
    {
      "id": "service2_label",
      "type": "text",
      "x": 590, "y": 500, 
      "text": "Order Service",
      "fontSize": 16
    },
    {
      "id": "database",
      "type": "rectangle",
      "x": 400, "y": 640,
      "width": 140, "height": 70,
      "backgroundColor": "#b2f2bb",
      "strokeColor": "#2f9e44", 
      "boundElements": [{"id": "db_label", "type": "text"}]
    },
    {
      "id": "db_label",
      "type": "text",
      "x": 470, "y": 675,
      "text": "PostgreSQL",
      "fontSize": 16
    },
    {
      "id": "arrow1",
      "type": "arrow", 
      "startBinding": {"elementId": "client", "focus": 0},
      "endBinding": {"elementId": "gateway", "focus": 0}
    },
    {
      "id": "arrow2", 
      "type": "arrow",
      "startBinding": {"elementId": "gateway", "focus": -0.5},
      "endBinding": {"elementId": "service1", "focus": 0}
    },
    {
      "id": "arrow3",
      "type": "arrow",
      "startBinding": {"elementId": "gateway", "focus": 0.5}, 
      "endBinding": {"elementId": "service2", "focus": 0}
    },
    {
      "id": "arrow4",
      "type": "arrow",
      "startBinding": {"elementId": "service1", "focus": 0},
      "endBinding": {"elementId": "database", "focus": -0.5}
    },
    {
      "id": "arrow5",
      "type": "arrow", 
      "startBinding": {"elementId": "service2", "focus": 0},
      "endBinding": {"elementId": "database", "focus": 0.5}
    }
  ],
  "camera": {"x": 200, "y": 50, "zoom": 0.8},
  "clip_range": [0, 7000]
}
```

```json
// add_keyframes_batch call  
{
  "keyframes": [
    {"element_id": "client", "time": 0, "opacity": 0},
    {"element_id": "client", "time": 500, "opacity": 1},
    {"element_id": "client_label", "time": 0, "opacity": 0},
    {"element_id": "client_label", "time": 500, "opacity": 1},
    
    {"element_id": "arrow1", "time": 500, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "arrow1", "time": 1500, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    
    {"element_id": "gateway", "time": 1500, "opacity": 0}, 
    {"element_id": "gateway", "time": 2000, "opacity": 1},
    {"element_id": "gateway_label", "time": 1500, "opacity": 0},
    {"element_id": "gateway_label", "time": 2000, "opacity": 1},
    
    {"element_id": "arrow2", "time": 2000, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "arrow2", "time": 3000, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    {"element_id": "arrow3", "time": 2000, "strokeDasharray": "5 5", "strokeDashoffset": 100}, 
    {"element_id": "arrow3", "time": 3000, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    
    {"element_id": "service1", "time": 3000, "opacity": 0},
    {"element_id": "service1", "time": 3750, "opacity": 1},
    {"element_id": "service1_label", "time": 3000, "opacity": 0},
    {"element_id": "service1_label", "time": 3750, "opacity": 1},
    
    {"element_id": "service2", "time": 3500, "opacity": 0},
    {"element_id": "service2", "time": 4250, "opacity": 1}, 
    {"element_id": "service2_label", "time": 3500, "opacity": 0},
    {"element_id": "service2_label", "time": 4250, "opacity": 1},
    
    {"element_id": "arrow4", "time": 4500, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "arrow4", "time": 5500, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    {"element_id": "arrow5", "time": 4500, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "arrow5", "time": 5500, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    
    {"element_id": "database", "time": 5500, "opacity": 0},
    {"element_id": "database", "time": 6000, "opacity": 1},
    {"element_id": "db_label", "time": 5500, "opacity": 0}, 
    {"element_id": "db_label", "time": 6000, "opacity": 1}
  ]
}
```

## Reference Files

- **[component-library.md](references/component-library.md)**: Complete JSON templates for all standard components
- **[layout-patterns.md](references/layout-patterns.md)**: Four common architecture patterns with full coordinates  
- **[animation-recipes.md](references/animation-recipes.md)**: Five animation patterns with complete keyframe JSON

## Usage Tips

- Start with simple 3-tier layouts before moving to complex microservices
- Use consistent component sizing and colors for professional appearance
- Test animations with small clip ranges (2-3 seconds) before full sequences  
- Group related services with boundary frames for clarity
- Keep text labels concise and readable at default zoom levels