# Animation Recipes

Five proven animation patterns for architecture diagrams with complete keyframe JSON.

## 1. Layer-by-Layer Reveal

Classic progressive disclosure: Layer 1 → Connections → Layer 2 → Connections → Layer 3...

**Timing Pattern:**
- Layer fade-in: 500ms duration  
- Arrow draw-on: 1000ms duration
- Stagger between layers: 500ms gap

```json
{
  "keyframes": [
    // Layer 1: Client (0-500ms)
    {"element_id": "client", "time": 0, "opacity": 0},
    {"element_id": "client", "time": 500, "opacity": 1},
    {"element_id": "client_label", "time": 0, "opacity": 0},
    {"element_id": "client_label", "time": 500, "opacity": 1},
    
    // L1→L2 Arrows (500-1500ms) 
    {"element_id": "arrow_client_gateway", "time": 500, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "arrow_client_gateway", "time": 1500, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    
    // Layer 2: Gateway (1500-2000ms)
    {"element_id": "gateway", "time": 1500, "opacity": 0},
    {"element_id": "gateway", "time": 2000, "opacity": 1},
    {"element_id": "gateway_label", "time": 1500, "opacity": 0},
    {"element_id": "gateway_label", "time": 2000, "opacity": 1},
    
    // L2→L3 Arrows (2000-3000ms)
    {"element_id": "arrow_gateway_service1", "time": 2000, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "arrow_gateway_service1", "time": 3000, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    {"element_id": "arrow_gateway_service2", "time": 2000, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "arrow_gateway_service2", "time": 3000, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    
    // Layer 3: Services (3000-4500ms, staggered)
    {"element_id": "service1", "time": 3000, "opacity": 0},
    {"element_id": "service1", "time": 3750, "opacity": 1},
    {"element_id": "service1_label", "time": 3000, "opacity": 0},
    {"element_id": "service1_label", "time": 3750, "opacity": 1},
    
    {"element_id": "service2", "time": 3500, "opacity": 0},
    {"element_id": "service2", "time": 4250, "opacity": 1},
    {"element_id": "service2_label", "time": 3500, "opacity": 0},
    {"element_id": "service2_label", "time": 4250, "opacity": 1},
    
    // L3→L4 Arrows (4500-5500ms)
    {"element_id": "arrow_service1_db", "time": 4500, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "arrow_service1_db", "time": 5500, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    {"element_id": "arrow_service2_db", "time": 4500, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "arrow_service2_db", "time": 5500, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    
    // Layer 4: Database (5500-6000ms)
    {"element_id": "database", "time": 5500, "opacity": 0},
    {"element_id": "database", "time": 6000, "opacity": 1},
    {"element_id": "db_label", "time": 5500, "opacity": 0},
    {"element_id": "db_label", "time": 6000, "opacity": 1}
  ]
}
```

## 2. Data Flow Trace

Follow a request through the system with highlighted path and moving indicator.

**Effect:** Highlight components in sequence + moving dot along arrows

```json
{
  "keyframes": [
    // All elements visible from start
    {"element_id": "client", "time": 0, "opacity": 1},
    {"element_id": "gateway", "time": 0, "opacity": 1}, 
    {"element_id": "service", "time": 0, "opacity": 1},
    {"element_id": "database", "time": 0, "opacity": 1},
    
    // Step 1: Highlight Client (0-1000ms)
    {"element_id": "client", "time": 0, "strokeColor": "#1971c2", "strokeWidth": 4},
    {"element_id": "client", "time": 1000, "strokeColor": "#1971c2", "strokeWidth": 2},
    
    // Step 2: Trace to Gateway (1000-2000ms)
    {"element_id": "arrow_client_gateway", "time": 1000, "strokeColor": "#1971c2", "strokeWidth": 4},
    {"element_id": "gateway", "time": 2000, "strokeColor": "#1971c2", "strokeWidth": 4},
    {"element_id": "arrow_client_gateway", "time": 2000, "strokeColor": "#495057", "strokeWidth": 2},
    
    // Step 3: Trace to Service (2000-3000ms)
    {"element_id": "arrow_gateway_service", "time": 2000, "strokeColor": "#1971c2", "strokeWidth": 4},
    {"element_id": "service", "time": 3000, "strokeColor": "#1971c2", "strokeWidth": 4},
    {"element_id": "gateway", "time": 3000, "strokeColor": "#1971c2", "strokeWidth": 2},
    {"element_id": "arrow_gateway_service", "time": 3000, "strokeColor": "#495057", "strokeWidth": 2},
    
    // Step 4: Trace to Database (3000-4000ms)
    {"element_id": "arrow_service_db", "time": 3000, "strokeColor": "#1971c2", "strokeWidth": 4},
    {"element_id": "database", "time": 4000, "strokeColor": "#1971c2", "strokeWidth": 4},
    {"element_id": "service", "time": 4000, "strokeColor": "#1971c2", "strokeWidth": 2},
    {"element_id": "arrow_service_db", "time": 4000, "strokeColor": "#495057", "strokeWidth": 2},
    
    // Reset all highlights (5000ms)
    {"element_id": "database", "time": 5000, "strokeColor": "#2f9e44", "strokeWidth": 2}
  ]
}
```

## 3. Highlight and Zoom

Focus attention on specific component with camera zoom + scale pulse.

**Effect:** Camera zooms to component, component pulses scale, then zoom out

```json
{
  "keyframes": [
    // All elements visible
    {"element_id": "service", "time": 0, "opacity": 1, "scale": [1, 1]},
    {"element_id": "gateway", "time": 0, "opacity": 0.3},
    {"element_id": "database", "time": 0, "opacity": 0.3},
    {"element_id": "client", "time": 0, "opacity": 0.3},
    
    // Zoom to service (0-1000ms)
    {"camera": true, "time": 0, "x": 100, "y": 100, "zoom": 0.8},
    {"camera": true, "time": 1000, "x": 250, "y": 300, "zoom": 1.5},
    
    // Pulse service scale (1000-2500ms)
    {"element_id": "service", "time": 1000, "scale": [1, 1], "strokeColor": "#1971c2"},
    {"element_id": "service", "time": 1500, "scale": [1.2, 1.2], "strokeColor": "#e03131"},
    {"element_id": "service", "time": 2000, "scale": [1, 1], "strokeColor": "#1971c2"},
    {"element_id": "service", "time": 2500, "scale": [1.1, 1.1], "strokeColor": "#e03131"},
    
    // Zoom back out (3000-4000ms)
    {"camera": true, "time": 3000, "x": 250, "y": 300, "zoom": 1.5},
    {"camera": true, "time": 4000, "x": 100, "y": 100, "zoom": 0.8},
    
    // Restore all elements (4000ms)
    {"element_id": "service", "time": 4000, "scale": [1, 1], "strokeColor": "#1971c2"},
    {"element_id": "gateway", "time": 4000, "opacity": 1},
    {"element_id": "database", "time": 4000, "opacity": 1},
    {"element_id": "client", "time": 4000, "opacity": 1}
  ]
}
```

## 4. Microservice Fan-out

Gateway appears, then services pop in radially with staggered timing.

**Effect:** Central gateway → services appear in waves radiating outward

```json
{
  "keyframes": [
    // Gateway appears first (0-500ms)
    {"element_id": "gateway", "time": 0, "opacity": 0, "scale": [0.5, 0.5]},
    {"element_id": "gateway", "time": 500, "opacity": 1, "scale": [1, 1]},
    {"element_id": "gateway_label", "time": 0, "opacity": 0},
    {"element_id": "gateway_label", "time": 500, "opacity": 1},
    
    // First wave of services (1000-1500ms) 
    {"element_id": "auth_service", "time": 1000, "opacity": 0, "scale": [0, 0]},
    {"element_id": "auth_service", "time": 1500, "opacity": 1, "scale": [1, 1]},
    {"element_id": "auth_label", "time": 1000, "opacity": 0},
    {"element_id": "auth_label", "time": 1500, "opacity": 1},
    
    {"element_id": "user_service", "time": 1200, "opacity": 0, "scale": [0, 0]},
    {"element_id": "user_service", "time": 1700, "opacity": 1, "scale": [1, 1]},
    {"element_id": "user_label", "time": 1200, "opacity": 0},
    {"element_id": "user_label", "time": 1700, "opacity": 1},
    
    // Second wave of services (1800-2300ms)
    {"element_id": "product_service", "time": 1800, "opacity": 0, "scale": [0, 0]},
    {"element_id": "product_service", "time": 2300, "opacity": 1, "scale": [1, 1]},
    {"element_id": "product_label", "time": 1800, "opacity": 0},
    {"element_id": "product_label", "time": 2300, "opacity": 1},
    
    {"element_id": "order_service", "time": 2000, "opacity": 0, "scale": [0, 0]},
    {"element_id": "order_service", "time": 2500, "opacity": 1, "scale": [1, 1]},
    {"element_id": "order_label", "time": 2000, "opacity": 0},
    {"element_id": "order_label", "time": 2500, "opacity": 1},
    
    // Third wave (2600-3100ms)
    {"element_id": "notification_service", "time": 2600, "opacity": 0, "scale": [0, 0]},
    {"element_id": "notification_service", "time": 3100, "opacity": 1, "scale": [1, 1]},
    {"element_id": "notif_label", "time": 2600, "opacity": 0},
    {"element_id": "notif_label", "time": 3100, "opacity": 1},
    
    // Connecting arrows appear last (3500-4500ms)
    {"element_id": "gateway_to_auth", "time": 3500, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "gateway_to_auth", "time": 4000, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    {"element_id": "gateway_to_user", "time": 3600, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "gateway_to_user", "time": 4100, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    {"element_id": "gateway_to_product", "time": 3700, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "gateway_to_product", "time": 4200, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    {"element_id": "gateway_to_order", "time": 3800, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "gateway_to_order", "time": 4300, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    {"element_id": "gateway_to_notification", "time": 3900, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "gateway_to_notification", "time": 4400, "strokeDasharray": "5 5", "strokeDashoffset": 0}
  ]
}
```

## 5. Progressive Build-up

Architecture grows organically from center outward with expanding boundaries.

**Effect:** Core components first → expand outward → boundaries grow to encompass

```json
{
  "keyframes": [
    // Core components appear (0-1000ms)
    {"element_id": "core_service", "time": 0, "opacity": 0, "scale": [0.8, 0.8]},
    {"element_id": "core_service", "time": 1000, "opacity": 1, "scale": [1, 1]},
    {"element_id": "core_label", "time": 0, "opacity": 0},
    {"element_id": "core_label", "time": 1000, "opacity": 1},
    
    {"element_id": "core_database", "time": 500, "opacity": 0, "scale": [0.8, 0.8]},
    {"element_id": "core_database", "time": 1500, "opacity": 1, "scale": [1, 1]},
    {"element_id": "core_db_label", "time": 500, "opacity": 0},
    {"element_id": "core_db_label", "time": 1500, "opacity": 1},
    
    // Core boundary expands (1500-2000ms)
    {"element_id": "core_boundary", "time": 1500, "opacity": 0, "width": 100, "height": 80},
    {"element_id": "core_boundary", "time": 2000, "opacity": 0.7, "width": 300, "height": 200},
    {"element_id": "core_title", "time": 2000, "opacity": 1},
    
    // API layer grows (2000-3000ms)  
    {"element_id": "api_gateway", "time": 2000, "opacity": 0, "y": 350},
    {"element_id": "api_gateway", "time": 2500, "opacity": 1, "y": 250},
    {"element_id": "gateway_label", "time": 2000, "opacity": 0, "y": 385},
    {"element_id": "gateway_label", "time": 2500, "opacity": 1, "y": 285},
    
    {"element_id": "load_balancer", "time": 2200, "opacity": 0, "y": 300},
    {"element_id": "load_balancer", "time": 2700, "opacity": 1, "y": 200},
    {"element_id": "lb_label", "time": 2200, "opacity": 0, "y": 335},
    {"element_id": "lb_label", "time": 2700, "opacity": 1, "y": 235},
    
    // API boundary expands (2800-3200ms)
    {"element_id": "api_boundary", "time": 2800, "opacity": 0, "width": 150, "height": 100},
    {"element_id": "api_boundary", "time": 3200, "opacity": 0.7, "width": 400, "height": 180},
    
    // Client layer emerges (3200-4000ms)
    {"element_id": "web_client", "time": 3200, "opacity": 0, "y": 150},
    {"element_id": "web_client", "time": 3700, "opacity": 1, "y": 50},
    {"element_id": "client_label", "time": 3200, "opacity": 0, "y": 185},
    {"element_id": "client_label", "time": 3700, "opacity": 1, "y": 85},
    
    {"element_id": "mobile_client", "time": 3400, "opacity": 0, "y": 150},
    {"element_id": "mobile_client", "time": 3900, "opacity": 1, "y": 50},
    {"element_id": "mobile_label", "time": 3400, "opacity": 0, "y": 185},
    {"element_id": "mobile_label", "time": 3900, "opacity": 1, "y": 85},
    
    // Full system boundary (4000-4500ms)
    {"element_id": "system_boundary", "time": 4000, "opacity": 0, "width": 200, "height": 150},
    {"element_id": "system_boundary", "time": 4500, "opacity": 0.5, "width": 600, "height": 500},
    {"element_id": "system_title", "time": 4500, "opacity": 1},
    
    // Final connecting arrows (4500-5500ms)
    {"element_id": "client_to_lb", "time": 4500, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "client_to_lb", "time": 5000, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    {"element_id": "mobile_to_gateway", "time": 4600, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "mobile_to_gateway", "time": 5100, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    {"element_id": "lb_to_gateway", "time": 4700, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "lb_to_gateway", "time": 5200, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    {"element_id": "gateway_to_core", "time": 4800, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "gateway_to_core", "time": 5300, "strokeDasharray": "5 5", "strokeDashoffset": 0},
    {"element_id": "core_to_db", "time": 4900, "strokeDasharray": "5 5", "strokeDashoffset": 100},
    {"element_id": "core_to_db", "time": 5400, "strokeDasharray": "5 5", "strokeDashoffset": 0}
  ]
}
```

## Animation Tips

1. **Timing Guidelines:**
   - Component fade-in: 300-500ms
   - Arrow draw-on: 800-1200ms  
   - Scale effects: 200-400ms
   - Camera movements: 1000-1500ms

2. **Staggering Patterns:**
   - Sequential: 500ms between elements
   - Wave effect: 200ms between similar elements
   - Radial: Start from center, 100-300ms delay per ring

3. **Visual Hierarchy:**
   - Core components appear first
   - Infrastructure before applications  
   - Connections after components
   - Labels with or immediately after components

4. **Performance Notes:**
   - Keep clip range tight (5-8 seconds max)
   - Limit simultaneous animations (<5 elements)
   - Use opacity over complex transforms when possible
   - Test on different devices/browsers

5. **Accessibility:**
   - Provide pause/replay controls for complex animations
   - Keep critical information visible without animation
   - Use consistent timing patterns for predictability