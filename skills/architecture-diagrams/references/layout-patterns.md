# Layout Patterns

Four common software architecture layout patterns with complete coordinates and JSON.

## 1. 3-Tier Layered Architecture

Classic presentation → business → data layers stacked vertically.

**Layout Grid:**
- Layer 1 (Client): y=100
- Layer 2 (API): y=280  
- Layer 3 (Services): y=460
- Layer 4 (Data): y=640
- Horizontal center: x=400
- Service spacing: 250px apart

```json
{
  "elements": [
    {
      "id": "web_client",
      "type": "rectangle",
      "x": 400, "y": 100,
      "width": 120, "height": 70,
      "backgroundColor": "#ffec99",
      "strokeColor": "#f08c00",
      "boundElements": [{"id": "web_label", "type": "text"}]
    },
    {
      "id": "web_label",
      "type": "text", 
      "x": 460, "y": 135,
      "text": "Web Client",
      "fontSize": 16
    },
    {
      "id": "api_gateway",
      "type": "rectangle",
      "x": 340, "y": 280,
      "width": 180, "height": 80, 
      "backgroundColor": "#99e9f2",
      "strokeColor": "#0c8599",
      "boundElements": [{"id": "gateway_label", "type": "text"}]
    },
    {
      "id": "gateway_label",
      "type": "text",
      "x": 430, "y": 320,
      "text": "API Gateway",
      "fontSize": 16
    },
    {
      "id": "user_service",
      "type": "rectangle", 
      "x": 250, "y": 460,
      "width": 180, "height": 80,
      "backgroundColor": "#a5d8ff",
      "strokeColor": "#1971c2",
      "boundElements": [{"id": "user_label", "type": "text"}]
    },
    {
      "id": "user_label",
      "type": "text",
      "x": 340, "y": 500,
      "text": "User Service", 
      "fontSize": 16
    },
    {
      "id": "order_service",
      "type": "rectangle",
      "x": 500, "y": 460,
      "width": 180, "height": 80,
      "backgroundColor": "#a5d8ff",
      "strokeColor": "#1971c2",
      "boundElements": [{"id": "order_label", "type": "text"}]
    },
    {
      "id": "order_label",
      "type": "text", 
      "x": 590, "y": 500,
      "text": "Order Service",
      "fontSize": 16
    },
    {
      "id": "database",
      "type": "rectangle",
      "x": 360, "y": 640,
      "width": 140, "height": 70,
      "backgroundColor": "#b2f2bb",
      "strokeColor": "#2f9e44",
      "boundElements": [{"id": "db_label", "type": "text"}]
    },
    {
      "id": "db_label",
      "type": "text",
      "x": 430, "y": 675,
      "text": "PostgreSQL", 
      "fontSize": 16
    },
    {
      "id": "client_to_gateway",
      "type": "arrow",
      "startBinding": {"elementId": "web_client", "focus": 0},
      "endBinding": {"elementId": "api_gateway", "focus": 0}
    },
    {
      "id": "gateway_to_user",
      "type": "arrow",
      "startBinding": {"elementId": "api_gateway", "focus": -0.5},
      "endBinding": {"elementId": "user_service", "focus": 0}
    },
    {
      "id": "gateway_to_order",
      "type": "arrow", 
      "startBinding": {"elementId": "api_gateway", "focus": 0.5},
      "endBinding": {"elementId": "order_service", "focus": 0}
    },
    {
      "id": "user_to_db",
      "type": "arrow",
      "startBinding": {"elementId": "user_service", "focus": 0},
      "endBinding": {"elementId": "database", "focus": -0.5}
    },
    {
      "id": "order_to_db",
      "type": "arrow",
      "startBinding": {"elementId": "order_service", "focus": 0},
      "endBinding": {"elementId": "database", "focus": 0.5}
    }
  ],
  "camera": {"x": 100, "y": 50, "zoom": 0.8},
  "clip_range": [0, 7000]
}
```

## 2. Microservices Architecture

API Gateway distributing to multiple independent services with shared data layer.

**Layout Grid:**
- Client: x=400, y=80
- Gateway: x=400, y=220  
- Services row: y=380, x=150,300,450,600,750
- Data row: y=560, x=300,500,700

```json
{
  "elements": [
    {
      "id": "mobile_client",
      "type": "rectangle",
      "x": 360, "y": 80,
      "width": 120, "height": 70,
      "backgroundColor": "#ffec99", 
      "strokeColor": "#f08c00",
      "boundElements": [{"id": "mobile_label", "type": "text"}]
    },
    {
      "id": "mobile_label", 
      "type": "text",
      "x": 420, "y": 115,
      "text": "Mobile App",
      "fontSize": 16
    },
    {
      "id": "gateway",
      "type": "rectangle",
      "x": 360, "y": 220,
      "width": 180, "height": 80,
      "backgroundColor": "#99e9f2",
      "strokeColor": "#0c8599",
      "boundElements": [{"id": "gw_label", "type": "text"}]
    },
    {
      "id": "gw_label",
      "type": "text",
      "x": 450, "y": 260, 
      "text": "API Gateway",
      "fontSize": 16
    },
    {
      "id": "auth_service",
      "type": "rectangle",
      "x": 150, "y": 380,
      "width": 140, "height": 70,
      "backgroundColor": "#a5d8ff",
      "strokeColor": "#1971c2",
      "boundElements": [{"id": "auth_label", "type": "text"}]
    },
    {
      "id": "auth_label",
      "type": "text",
      "x": 220, "y": 415,
      "text": "Auth",
      "fontSize": 16
    },
    {
      "id": "user_micro", 
      "type": "rectangle",
      "x": 300, "y": 380,
      "width": 140, "height": 70,
      "backgroundColor": "#a5d8ff",
      "strokeColor": "#1971c2",
      "boundElements": [{"id": "user_micro_label", "type": "text"}]
    },
    {
      "id": "user_micro_label",
      "type": "text",
      "x": 370, "y": 415,
      "text": "Users", 
      "fontSize": 16
    },
    {
      "id": "product_service",
      "type": "rectangle",
      "x": 450, "y": 380,
      "width": 140, "height": 70,
      "backgroundColor": "#a5d8ff",
      "strokeColor": "#1971c2",
      "boundElements": [{"id": "product_label", "type": "text"}]
    },
    {
      "id": "product_label",
      "type": "text",
      "x": 520, "y": 415,
      "text": "Products",
      "fontSize": 16
    },
    {
      "id": "order_micro", 
      "type": "rectangle",
      "x": 600, "y": 380,
      "width": 140, "height": 70,
      "backgroundColor": "#a5d8ff",
      "strokeColor": "#1971c2",
      "boundElements": [{"id": "order_micro_label", "type": "text"}]
    },
    {
      "id": "order_micro_label",
      "type": "text",
      "x": 670, "y": 415,
      "text": "Orders",
      "fontSize": 16
    },
    {
      "id": "notification_service",
      "type": "rectangle",
      "x": 750, "y": 380, 
      "width": 140, "height": 70,
      "backgroundColor": "#a5d8ff",
      "strokeColor": "#1971c2",
      "boundElements": [{"id": "notif_label", "type": "text"}]
    },
    {
      "id": "notif_label",
      "type": "text",
      "x": 820, "y": 415,
      "text": "Notifications",
      "fontSize": 14
    },
    {
      "id": "user_db",
      "type": "rectangle",
      "x": 300, "y": 560,
      "width": 140, "height": 70, 
      "backgroundColor": "#b2f2bb",
      "strokeColor": "#2f9e44",
      "boundElements": [{"id": "user_db_label", "type": "text"}]
    },
    {
      "id": "user_db_label",
      "type": "text",
      "x": 370, "y": 595,
      "text": "User DB",
      "fontSize": 16
    },
    {
      "id": "product_db",
      "type": "rectangle",
      "x": 500, "y": 560,
      "width": 140, "height": 70,
      "backgroundColor": "#b2f2bb", 
      "strokeColor": "#2f9e44",
      "boundElements": [{"id": "product_db_label", "type": "text"}]
    },
    {
      "id": "product_db_label",
      "type": "text",
      "x": 570, "y": 595,
      "text": "Product DB",
      "fontSize": 16
    },
    {
      "id": "order_db",
      "type": "rectangle",
      "x": 700, "y": 560,
      "width": 140, "height": 70,
      "backgroundColor": "#b2f2bb",
      "strokeColor": "#2f9e44",
      "boundElements": [{"id": "order_db_label", "type": "text"}]
    },
    {
      "id": "order_db_label", 
      "type": "text",
      "x": 770, "y": 595,
      "text": "Order DB",
      "fontSize": 16
    }
  ],
  "camera": {"x": 50, "y": 30, "zoom": 0.7},
  "clip_range": [0, 8000]
}
```

## 3. Event-Driven Architecture

Producers → Event Bus → Consumers with message flow.

**Layout Grid:**
- Producers row: y=200, x=150,300,450
- Event Bus: x=450, y=350
- Consumers row: y=500, x=250,450,650

```json
{
  "elements": [
    {
      "id": "web_producer",
      "type": "rectangle",
      "x": 150, "y": 200, 
      "width": 140, "height": 70,
      "backgroundColor": "#ffec99",
      "strokeColor": "#f08c00",
      "boundElements": [{"id": "web_prod_label", "type": "text"}]
    },
    {
      "id": "web_prod_label",
      "type": "text",
      "x": 220, "y": 235,
      "text": "Web App",
      "fontSize": 16
    },
    {
      "id": "api_producer",
      "type": "rectangle",
      "x": 300, "y": 200,
      "width": 140, "height": 70, 
      "backgroundColor": "#a5d8ff",
      "strokeColor": "#1971c2",
      "boundElements": [{"id": "api_prod_label", "type": "text"}]
    },
    {
      "id": "api_prod_label",
      "type": "text",
      "x": 370, "y": 235,
      "text": "API Service",
      "fontSize": 16
    },
    {
      "id": "external_producer",
      "type": "rectangle",
      "x": 450, "y": 200,
      "width": 140, "height": 70,
      "backgroundColor": "#d0bfff",
      "strokeColor": "#6741d9", 
      "strokeStyle": "dashed",
      "boundElements": [{"id": "ext_prod_label", "type": "text"}]
    },
    {
      "id": "ext_prod_label",
      "type": "text",
      "x": 520, "y": 235,
      "text": "External API",
      "fontSize": 16
    },
    {
      "id": "event_bus",
      "type": "ellipse",
      "x": 400, "y": 330,
      "width": 200, "height": 100,
      "backgroundColor": "#ffd8a8",
      "strokeColor": "#f08c00", 
      "boundElements": [{"id": "bus_label", "type": "text"}]
    },
    {
      "id": "bus_label",
      "type": "text",
      "x": 500, "y": 380,
      "text": "Event Bus",
      "fontSize": 18,
      "fontWeight": "bold"
    },
    {
      "id": "email_consumer",
      "type": "rectangle",
      "x": 250, "y": 500,
      "width": 140, "height": 70,
      "backgroundColor": "#a5d8ff",
      "strokeColor": "#1971c2", 
      "boundElements": [{"id": "email_label", "type": "text"}]
    },
    {
      "id": "email_label",
      "type": "text",
      "x": 320, "y": 535,
      "text": "Email Service",
      "fontSize": 16
    },
    {
      "id": "analytics_consumer",
      "type": "rectangle",
      "x": 450, "y": 500,
      "width": 140, "height": 70,
      "backgroundColor": "#a5d8ff",
      "strokeColor": "#1971c2",
      "boundElements": [{"id": "analytics_label", "type": "text"}]
    },
    {
      "id": "analytics_label", 
      "type": "text",
      "x": 520, "y": 535,
      "text": "Analytics",
      "fontSize": 16
    },
    {
      "id": "audit_consumer",
      "type": "rectangle",
      "x": 650, "y": 500,
      "width": 140, "height": 70,
      "backgroundColor": "#a5d8ff",
      "strokeColor": "#1971c2",
      "boundElements": [{"id": "audit_label", "type": "text"}]
    },
    {
      "id": "audit_label",
      "type": "text",
      "x": 720, "y": 535,
      "text": "Audit Service", 
      "fontSize": 16
    }
  ],
  "camera": {"x": 50, "y": 150, "zoom": 0.8},
  "clip_range": [0, 6000]
}
```

## 4. Hexagonal Architecture

Core business logic in center, adapters around the perimeter.

**Layout Grid:**
- Core: x=400, y=350 (center)
- Primary Adapters (left): x=150, y=250,350,450
- Secondary Adapters (right): x=650, y=250,350,450  
- Infrastructure (top/bottom): x=400, y=150,550

```json
{
  "elements": [
    {
      "id": "core_domain",
      "type": "hexagon",
      "x": 350, "y": 300, 
      "width": 160, "height": 140,
      "backgroundColor": "#a5d8ff",
      "strokeColor": "#1971c2",
      "strokeWidth": 3,
      "boundElements": [{"id": "core_label", "type": "text"}]
    },
    {
      "id": "core_label",
      "type": "text",
      "x": 430, "y": 370,
      "text": "Core Domain",
      "fontSize": 18,
      "fontWeight": "bold"
    },
    {
      "id": "rest_adapter",
      "type": "rectangle",
      "x": 80, "y": 250, 
      "width": 140, "height": 70,
      "backgroundColor": "#99e9f2",
      "strokeColor": "#0c8599",
      "boundElements": [{"id": "rest_label", "type": "text"}]
    },
    {
      "id": "rest_label",
      "type": "text",
      "x": 150, "y": 285,
      "text": "REST API",
      "fontSize": 16
    },
    {
      "id": "web_adapter",
      "type": "rectangle",
      "x": 80, "y": 350,
      "width": 140, "height": 70, 
      "backgroundColor": "#ffec99",
      "strokeColor": "#f08c00",
      "boundElements": [{"id": "web_adp_label", "type": "text"}]
    },
    {
      "id": "web_adp_label",
      "type": "text",
      "x": 150, "y": 385,
      "text": "Web UI",
      "fontSize": 16
    },
    {
      "id": "cli_adapter",
      "type": "rectangle",
      "x": 80, "y": 450,
      "width": 140, "height": 70,
      "backgroundColor": "#ffec99", 
      "strokeColor": "#f08c00",
      "boundElements": [{"id": "cli_label", "type": "text"}]
    },
    {
      "id": "cli_label",
      "type": "text",
      "x": 150, "y": 485,
      "text": "CLI",
      "fontSize": 16
    },
    {
      "id": "db_adapter",
      "type": "rectangle",
      "x": 620, "y": 250,
      "width": 140, "height": 70,
      "backgroundColor": "#b2f2bb",
      "strokeColor": "#2f9e44",
      "boundElements": [{"id": "db_adp_label", "type": "text"}]
    },
    {
      "id": "db_adp_label", 
      "type": "text",
      "x": 690, "y": 285,
      "text": "Database",
      "fontSize": 16
    },
    {
      "id": "email_adapter",
      "type": "rectangle",
      "x": 620, "y": 350,
      "width": 140, "height": 70,
      "backgroundColor": "#d0bfff",
      "strokeColor": "#6741d9",
      "boundElements": [{"id": "email_adp_label", "type": "text"}]
    },
    {
      "id": "email_adp_label",
      "type": "text",
      "x": 690, "y": 385,
      "text": "Email Service", 
      "fontSize": 16
    },
    {
      "id": "file_adapter",
      "type": "rectangle",
      "x": 620, "y": 450,
      "width": 140, "height": 70,
      "backgroundColor": "#b2f2bb",
      "strokeColor": "#2f9e44",
      "boundElements": [{"id": "file_label", "type": "text"}]
    },
    {
      "id": "file_label",
      "type": "text",
      "x": 690, "y": 485,
      "text": "File System",
      "fontSize": 16
    },
    {
      "id": "config_service", 
      "type": "rectangle",
      "x": 360, "y": 150,
      "width": 140, "height": 70,
      "backgroundColor": "#d0bfff",
      "strokeColor": "#6741d9",
      "boundElements": [{"id": "config_label", "type": "text"}]
    },
    {
      "id": "config_label",
      "type": "text",
      "x": 430, "y": 185,
      "text": "Configuration",
      "fontSize": 16
    },
    {
      "id": "monitoring",
      "type": "rectangle",
      "x": 360, "y": 550,
      "width": 140, "height": 70, 
      "backgroundColor": "#d0bfff",
      "strokeColor": "#6741d9",
      "boundElements": [{"id": "monitor_label", "type": "text"}]
    },
    {
      "id": "monitor_label",
      "type": "text",
      "x": 430, "y": 585,
      "text": "Monitoring",
      "fontSize": 16
    }
  ],
  "camera": {"x": 20, "y": 100, "zoom": 0.8},
  "clip_range": [0, 7000]
}
```

## Layout Tips

1. **Maintain consistent spacing** - Use 250px horizontal and 180px vertical grid
2. **Align components** - Keep similar components on same horizontal/vertical lines  
3. **Group related elements** - Use boundary frames for logical groupings
4. **Consider flow direction** - Arrange components to match typical data/request flow
5. **Scale appropriately** - Adjust camera zoom to fit all components comfortably
6. **Leave space for labels** - Ensure text doesn't overlap with component boundaries