# Network Component Library

Pre-defined JSON templates for common network topology components. All components include proper boundElements for labels and follow consistent sizing/coloring conventions.

## Infrastructure Servers

### Generic Server
```json
{
  "id": "server1", "type": "rectangle", "x": 400, "y": 300, "width": 160, "height": 70,
  "fillStyle": "solid", "backgroundColor": "#d0ebff", "strokeColor": "#1971c2", "strokeWidth": 2,
  "boundElements": [{"id": "server1_label", "type": "text"}]
}
```

### Web Server
```json
{
  "id": "webserver1", "type": "rectangle", "x": 400, "y": 300, "width": 160, "height": 70,
  "fillStyle": "solid", "backgroundColor": "#d0ebff", "strokeColor": "#1971c2", "strokeWidth": 2,
  "boundElements": [{"id": "webserver1_label", "type": "text"}]
},
{
  "id": "webserver1_label", "type": "text", "x": 430, "y": 325, "width": 100, "height": 20,
  "text": "Web Server", "fontSize": 14, "textAlign": "center", "containerId": "webserver1"
}
```

### Application Server
```json
{
  "id": "appserver1", "type": "rectangle", "x": 400, "y": 300, "width": 160, "height": 70,
  "fillStyle": "solid", "backgroundColor": "#d0ebff", "strokeColor": "#1971c2", "strokeWidth": 2,
  "boundElements": [{"id": "appserver1_label", "type": "text"}]
},
{
  "id": "appserver1_label", "type": "text", "x": 430, "y": 325, "width": 100, "height": 20,
  "text": "App Server", "fontSize": 14, "textAlign": "center", "containerId": "appserver1"
}
```

### Database Server
```json
{
  "id": "dbserver1", "type": "rectangle", "x": 400, "y": 300, "width": 160, "height": 70,
  "fillStyle": "solid", "backgroundColor": "#c8f7c5", "strokeColor": "#2f9e44", "strokeWidth": 2,
  "boundElements": [{"id": "dbserver1_label", "type": "text"}]
},
{
  "id": "dbserver1_label", "type": "text", "x": 430, "y": 325, "width": 100, "height": 20,
  "text": "Database", "fontSize": 14, "textAlign": "center", "containerId": "dbserver1"
}
```

## Client Devices

### Desktop Client
```json
{
  "id": "client1", "type": "rectangle", "x": 400, "y": 300, "width": 120, "height": 60,
  "fillStyle": "solid", "backgroundColor": "#fff3cd", "strokeColor": "#fab005", "strokeWidth": 2,
  "boundElements": [{"id": "client1_label", "type": "text"}]
},
{
  "id": "client1_label", "type": "text", "x": 430, "y": 325, "width": 60, "height": 20,
  "text": "Client", "fontSize": 14, "textAlign": "center", "containerId": "client1"
}
```

### Mobile Device
```json
{
  "id": "mobile1", "type": "rectangle", "x": 400, "y": 300, "width": 80, "height": 120,
  "fillStyle": "solid", "backgroundColor": "#fff3cd", "strokeColor": "#fab005", "strokeWidth": 2,
  "boundElements": [{"id": "mobile1_label", "type": "text"}]
},
{
  "id": "mobile1_label", "type": "text", "x": 415, "y": 355, "width": 50, "height": 20,
  "text": "Mobile", "fontSize": 12, "textAlign": "center", "containerId": "mobile1"
}
```

### Laptop
```json
{
  "id": "laptop1", "type": "rectangle", "x": 400, "y": 300, "width": 140, "height": 80,
  "fillStyle": "solid", "backgroundColor": "#fff3cd", "strokeColor": "#fab005", "strokeWidth": 2,
  "boundElements": [{"id": "laptop1_label", "type": "text"}]
},
{
  "id": "laptop1_label", "type": "text", "x": 440, "y": 335, "width": 60, "height": 20,
  "text": "Laptop", "fontSize": 14, "textAlign": "center", "containerId": "laptop1"
}
```

## Network Equipment

### Router/Switch
```json
{
  "id": "router1", "type": "diamond", "x": 400, "y": 300, "width": 120, "height": 100,
  "fillStyle": "solid", "backgroundColor": "#c5f6fa", "strokeColor": "#0c8599", "strokeWidth": 2,
  "boundElements": [{"id": "router1_label", "type": "text"}]
},
{
  "id": "router1_label", "type": "text", "x": 430, "y": 345, "width": 60, "height": 20,
  "text": "Router", "fontSize": 14, "textAlign": "center", "containerId": "router1"
}
```

### Firewall
```json
{
  "id": "firewall1", "type": "rectangle", "x": 400, "y": 300, "width": 160, "height": 70,
  "fillStyle": "solid", "backgroundColor": "#ffdedb", "strokeColor": "#e03131", "strokeWidth": 2,
  "strokeStyle": "dashed", "boundElements": [{"id": "firewall1_label", "type": "text"}]
},
{
  "id": "firewall1_label", "type": "text", "x": 430, "y": 325, "width": 100, "height": 20,
  "text": "Firewall", "fontSize": 14, "textAlign": "center", "containerId": "firewall1"
}
```

### Load Balancer
```json
{
  "id": "loadbalancer1", "type": "ellipse", "x": 400, "y": 300, "width": 130, "height": 60,
  "fillStyle": "solid", "backgroundColor": "#e5dbff", "strokeColor": "#7c2d8e", "strokeWidth": 2,
  "boundElements": [{"id": "loadbalancer1_label", "type": "text"}]
},
{
  "id": "loadbalancer1_label", "type": "text", "x": 430, "y": 325, "width": 70, "height": 20,
  "text": "Load Balancer", "fontSize": 12, "textAlign": "center", "containerId": "loadbalancer1"
}
```

### VPN Gateway
```json
{
  "id": "vpngateway1", "type": "rectangle", "x": 400, "y": 300, "width": 140, "height": 60,
  "fillStyle": "solid", "backgroundColor": "#ffe0cc", "strokeColor": "#fd7e14", "strokeWidth": 2,
  "boundElements": [{"id": "vpngateway1_label", "type": "text"}]
},
{
  "id": "vpngateway1_label", "type": "text", "x": 430, "y": 325, "width": 80, "height": 20,
  "text": "VPN Gateway", "fontSize": 12, "textAlign": "center", "containerId": "vpngateway1"
}
```

## Cloud and CDN Components

### Cloud Gateway
```json
{
  "id": "cloudgateway1", "type": "rectangle", "x": 400, "y": 300, "width": 150, "height": 80,
  "fillStyle": "solid", "backgroundColor": "#f1f3f4", "strokeColor": "#868e96", "strokeWidth": 2,
  "rx": 20, "ry": 20, "boundElements": [{"id": "cloudgateway1_label", "type": "text"}]
},
{
  "id": "cloudgateway1_label", "type": "text", "x": 435, "y": 335, "width": 80, "height": 20,
  "text": "Cloud Gateway", "fontSize": 12, "textAlign": "center", "containerId": "cloudgateway1"
}
```

### CDN Node
```json
{
  "id": "cdn1", "type": "rectangle", "x": 400, "y": 300, "width": 120, "height": 60,
  "fillStyle": "solid", "backgroundColor": "#e5dbff", "strokeColor": "#9775fa", "strokeWidth": 2,
  "rx": 15, "ry": 15, "boundElements": [{"id": "cdn1_label", "type": "text"}]
},
{
  "id": "cdn1_label", "type": "text", "x": 430, "y": 325, "width": 60, "height": 20,
  "text": "CDN", "fontSize": 14, "textAlign": "center", "containerId": "cdn1"
}
```

### DNS Server
```json
{
  "id": "dns1", "type": "ellipse", "x": 400, "y": 300, "width": 100, "height": 60,
  "fillStyle": "solid", "backgroundColor": "#c8f7c5", "strokeColor": "#51cf66", "strokeWidth": 2,
  "boundElements": [{"id": "dns1_label", "type": "text"}]
},
{
  "id": "dns1_label", "type": "text", "x": 425, "y": 325, "width": 50, "height": 20,
  "text": "DNS", "fontSize": 14, "textAlign": "center", "containerId": "dns1"
}
```

## Special Components

### Internet Cloud
```json
{
  "id": "internet", "type": "ellipse", "x": 400, "y": 300, "width": 120, "height": 60,
  "fillStyle": "solid", "backgroundColor": "#e9ecef", "strokeColor": "#6c757d", "strokeWidth": 2,
  "boundElements": [{"id": "internet_label", "type": "text"}]
},
{
  "id": "internet_label", "type": "text", "x": 430, "y": 325, "width": 60, "height": 20,
  "text": "Internet", "fontSize": 14, "textAlign": "center", "containerId": "internet"
}
```

### NAT Gateway
```json
{
  "id": "natgateway1", "type": "rectangle", "x": 400, "y": 300, "width": 120, "height": 60,
  "fillStyle": "solid", "backgroundColor": "#d3f9d8", "strokeColor": "#37b24d", "strokeWidth": 2,
  "boundElements": [{"id": "natgateway1_label", "type": "text"}]
},
{
  "id": "natgateway1_label", "type": "text", "x": 430, "y": 325, "width": 60, "height": 20,
  "text": "NAT Gateway", "fontSize": 12, "textAlign": "center", "containerId": "natgateway1"
}
```

### Internet Gateway
```json
{
  "id": "igw1", "type": "rectangle", "x": 400, "y": 300, "width": 140, "height": 60,
  "fillStyle": "solid", "backgroundColor": "#d3f9d8", "strokeColor": "#37b24d", "strokeWidth": 2,
  "boundElements": [{"id": "igw1_label", "type": "text"}]
},
{
  "id": "igw1_label", "type": "text", "x": 435, "y": 325, "width": 70, "height": 20,
  "text": "Internet Gateway", "fontSize": 11, "textAlign": "center", "containerId": "igw1"
}
```

## Connection Templates

### Standard Data Flow
```json
{
  "id": "connection1", "type": "arrow", "x": 200, "y": 300, "width": 200, "height": 0,
  "points": [[0, 0], [200, 0]], "endArrowhead": "arrow", "strokeColor": "#495057", "strokeWidth": 2
}
```

### Management Connection (Dashed)
```json
{
  "id": "mgmt_connection1", "type": "line", "x": 200, "y": 300, "width": 200, "height": 0,
  "points": [[0, 0], [200, 0]], "strokeColor": "#868e96", "strokeWidth": 2, "strokeStyle": "dashed"
}
```

### Bidirectional Data Flow
```json
{
  "id": "bidir_connection1", "type": "arrow", "x": 200, "y": 300, "width": 200, "height": 0,
  "points": [[0, 0], [200, 0]], "startArrowhead": "arrow", "endArrowhead": "arrow", 
  "strokeColor": "#495057", "strokeWidth": 2
}
```

### High-Bandwidth Connection
```json
{
  "id": "highbw_connection1", "type": "arrow", "x": 200, "y": 300, "width": 200, "height": 0,
  "points": [[0, 0], [200, 0]], "endArrowhead": "arrow", "strokeColor": "#1971c2", "strokeWidth": 4
}
```