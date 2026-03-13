# Timeline Layout Patterns

## 1. Horizontal Milestone Timeline

**Best for:** Project milestones, product releases, event sequences  
**Canvas:** 1600×600

```
Main axis: (100,300) → (1500,300)
Milestone positions (alternating above/below):

Event 1: marker (250,300), card (160,160), connector (250,300)→(250,240)
Event 2: marker (450,300), card (360,380), connector (450,300)→(450,380)  
Event 3: marker (650,300), card (560,160), connector (650,300)→(650,240)
Event 4: marker (850,300), card (760,380), connector (850,300)→(850,380)
Event 5: marker (1050,300), card (960,160), connector (1050,300)→(1050,240)
Event 6: marker (1250,300), card (1160,380), connector (1250,300)→(1250,380)

Date labels: (250,340), (450,340), (650,340), (850,340), (1050,340), (1250,340)
```

**Card dimensions:** 180×80  
**Marker size:** 20×20 ellipse  
**Spacing:** 200px intervals

## 2. Vertical Timeline

**Best for:** Historical sequences, chronological narratives  
**Canvas:** 800×1200

```
Main axis: (400,100) → (400,1100)  
Timeline flows top to bottom:

Event 1: marker (400,200), card (450,160), connector (400,200)→(450,180)
Event 2: marker (400,350), card (150,310), connector (400,350)→(330,330)
Event 3: marker (400,500), card (450,460), connector (400,500)→(450,480) 
Event 4: marker (400,650), card (150,610), connector (400,650)→(330,630)
Event 5: marker (400,800), card (450,760), connector (400,800)→(450,780)
Event 6: marker (400,950), card (150,910), connector (400,950)→(330,930)

Date labels: (350,200), (350,350), (350,500), (350,650), (350,800), (350,950)
```

**Card dimensions:** 200×80  
**Marker size:** 16×16 ellipse  
**Spacing:** 150px vertical intervals  
**Side alternation:** Right (x=450), Left (x=150)

## 3. Multi-Track Roadmap (Gantt-style)

**Best for:** Parallel workstreams, team coordination, resource planning  
**Canvas:** 1600×700

```
Track headers:
- Development: rect (20,180) 150×40
- Design: rect (20,280) 150×40  
- Testing: rect (20,380) 150×40
- Marketing: rect (20,480) 150×40

Time axis: (200,100) → (1500,100)
Month markers: (300,100), (500,100), (700,100), (900,100), (1100,100), (1300,100)
Month labels: (300,80), (500,80), (700,80), (900,80), (1100,80), (1300,80)

Phase blocks spanning tracks:
Phase 1 (Jan-Feb): rect (250,200) 200×280 [spans all tracks]
Phase 2 (Mar-Apr): rect (450,200) 200×180 [dev + design only]  
Phase 3 (May-Jun): rect (650,280) 200×200 [design + testing + marketing]

Individual task blocks:
Task A: rect (300,200) 150×40 [development track]
Task B: rect (500,280) 180×40 [design track]
Task C: rect (700,380) 160×40 [testing track]
```

**Track spacing:** 100px vertical  
**Phase block opacity:** 0.3  
**Task block opacity:** 0.8

## 4. Curved/Organic Timeline

**Best for:** Storytelling, creative projects, journey maps  
**Canvas:** 1400×800  

```
Curved path: Bezier curve from (200,400) through control points (400,200) (800,600) to (1200,300)

Path points (following curve):
Point 1: (250,380) - Early stage
Point 2: (400,200) - Growth phase  
Point 3: (600,450) - Challenge period
Point 4: (800,600) - Recovery 
Point 5: (1000,400) - Maturity
Point 6: (1150,320) - Current state

Event cards positioned perpendicular to curve:
Card 1: offset 60px above curve at point 1
Card 2: offset 60px below curve at point 2
Card 3: offset 60px above curve at point 3
Card 4: offset 60px below curve at point 4  
Card 5: offset 60px above curve at point 5
Card 6: offset 60px below curve at point 6

Connector lines: From path point to card center
Path dots: 12×12 ellipse at each path point
```

**Path stroke:** 4px width, hand-drawn style  
**Card dimensions:** 160×70  
**Path style:** `stroke-dasharray: 5,3` for dashed effect