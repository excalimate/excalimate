# Educational Patterns

Four fundamental patterns for structuring educational explainer animations, with timing guidelines and keyframe examples.

## Pattern 1: Introduce → Explain → Example

**Use when**: Teaching new concepts that benefit from concrete examples
**Structure**: Present concept → Break down components → Show real application
**Timing**: 3-4 steps, 12-18 seconds total

### Step Sequence
1. **Introduce** (2-3s): Present the main concept/term
2. **Explain** (4-6s): Break down into key components  
3. **Example** (4-6s): Show practical application
4. **Connect** (2-3s): Link example back to concept

### JSON Template
```json
{
  "elements": [
    {
      "id": "concept-title",
      "type": "text", 
      "x": 400, "y": 100,
      "label": {
        "text": "Main Concept",
        "fontSize": 24,
        "fontWeight": "bold"
      }
    },
    {
      "id": "definition-box",
      "type": "rectangle",
      "x": 200, "y": 150,
      "width": 400, "height": 80,
      "backgroundColor": "#EBF8FF",
      "label": {
        "text": "Definition and key characteristics",
        "fontSize": 14
      }
    },
    {
      "id": "example-diagram",
      "type": "rectangle",
      "x": 150, "y": 280,
      "width": 500, "height": 200,
      "backgroundColor": "#F0FFF4",
      "strokeColor": "#38A169"
    }
  ],
  "animations": [
    {
      "id": "introduce-phase",
      "keyframes": [
        {"time": 0, "elements": {"concept-title": {"opacity": 0}}},
        {"time": 1000, "elements": {"concept-title": {"opacity": 1}}}
      ]
    },
    {
      "id": "explain-phase", 
      "keyframes": [
        {"time": 2000, "elements": {"definition-box": {"opacity": 0}}},
        {"time": 3000, "elements": {"definition-box": {"opacity": 1}}}
      ]
    },
    {
      "id": "example-phase",
      "keyframes": [
        {"time": 6000, "elements": {"example-diagram": {"opacity": 0}}},
        {"time": 7000, "elements": {"example-diagram": {"opacity": 1}}}
      ]
    }
  ]
}
```

## Pattern 2: Build-up (Empty → Complete)

**Use when**: Showing processes, assembly, or step-by-step construction  
**Structure**: Start with empty foundation → Add elements progressively → Complete system
**Timing**: 4-6 steps, 15-25 seconds total

### Step Sequence
1. **Foundation** (2s): Show basic structure/starting point
2. **Layer 1** (3-4s): Add first component with explanation
3. **Layer 2** (3-4s): Add second component, show relationships
4. **Layer N** (3-4s): Continue building complexity
5. **Complete** (2-3s): Show final system in operation
6. **Summary** (2s): Highlight key relationships

### JSON Template  
```json
{
  "elements": [
    {
      "id": "foundation",
      "type": "rectangle",
      "x": 300, "y": 400, 
      "width": 200, "height": 20,
      "backgroundColor": "#E2E8F0"
    },
    {
      "id": "component-1",
      "type": "rectangle", 
      "x": 320, "y": 340,
      "width": 60, "height": 60,
      "backgroundColor": "#4299E1"
    },
    {
      "id": "component-2",
      "type": "rectangle",
      "x": 420, "y": 340, 
      "width": 60, "height": 60,
      "backgroundColor": "#48BB78"
    },
    {
      "id": "connection-line",
      "type": "line",
      "points": [[350, 370], [450, 370]],
      "strokeColor": "#A0AEC0"
    }
  ],
  "animations": [
    {
      "id": "build-sequence",
      "keyframes": [
        {
          "time": 0,
          "elements": {
            "foundation": {"opacity": 0},
            "component-1": {"opacity": 0}, 
            "component-2": {"opacity": 0},
            "connection-line": {"opacity": 0}
          }
        },
        {
          "time": 1500,
          "elements": {"foundation": {"opacity": 1}}
        },
        {
          "time": 3500,
          "elements": {"component-1": {"opacity": 1}}
        },
        {
          "time": 6500,
          "elements": {"component-2": {"opacity": 1}}
        },
        {
          "time": 9500,
          "elements": {"connection-line": {"opacity": 1}}
        }
      ]
    }
  ]
}
```

## Pattern 3: Compare & Contrast

**Use when**: Explaining differences between approaches, before/after states, or alternatives
**Structure**: Show Option A → Show Option B → Highlight differences → Explain trade-offs  
**Timing**: 4-5 steps, 18-25 seconds total

### Step Sequence
1. **Setup** (2s): Present the comparison question/scenario
2. **Option A** (4-5s): Show first approach with details
3. **Option B** (4-5s): Show second approach with details  
4. **Compare** (4-6s): Highlight key differences side-by-side
5. **Conclusion** (3-4s): Summarize when to use each

### JSON Template
```json
{
  "elements": [
    {
      "id": "comparison-title",
      "type": "text",
      "x": 400, "y": 50,
      "label": {
        "text": "Option A vs Option B",
        "fontSize": 20
      }
    },
    {
      "id": "option-a-area",
      "type": "rectangle",
      "x": 100, "y": 150,
      "width": 250, "height": 200,
      "backgroundColor": "#FED7D7",
      "strokeColor": "#E53E3E",
      "label": {
        "text": "Option A\nCharacteristics",
        "fontSize": 14
      }
    },
    {
      "id": "option-b-area", 
      "type": "rectangle",
      "x": 450, "y": 150,
      "width": 250, "height": 200,
      "backgroundColor": "#C6F6D5", 
      "strokeColor": "#38A169",
      "label": {
        "text": "Option B\nCharacteristics",
        "fontSize": 14
      }
    },
    {
      "id": "vs-arrow",
      "type": "arrow",
      "points": [[350, 250], [450, 250]],
      "strokeColor": "#4A5568",
      "strokeWidth": 3
    }
  ],
  "animations": [
    {
      "id": "comparison-sequence",
      "keyframes": [
        {
          "time": 0,
          "elements": {
            "comparison-title": {"opacity": 1},
            "option-a-area": {"opacity": 0},
            "option-b-area": {"opacity": 0},
            "vs-arrow": {"opacity": 0}
          }
        },
        {
          "time": 2000,
          "elements": {"option-a-area": {"opacity": 1}}
        },
        {
          "time": 6000,
          "elements": {"option-b-area": {"opacity": 1}}
        },
        {
          "time": 10000,
          "elements": {"vs-arrow": {"opacity": 1}}
        }
      ]
    }
  ],
  "camera": [
    {"time": 2000, "x": 225, "y": 250, "zoom": 1.3},
    {"time": 6000, "x": 575, "y": 250, "zoom": 1.3},
    {"time": 10000, "x": 400, "y": 250, "zoom": 0.9}
  ]
}
```

## Pattern 4: Problem → Solution

**Use when**: Teaching troubleshooting, optimization, or problem-solving approaches
**Structure**: Present problem → Analyze causes → Show solution → Verify results
**Timing**: 4-5 steps, 16-22 seconds total

### Step Sequence
1. **Problem** (3-4s): Show the issue/challenge clearly
2. **Analyze** (4-5s): Break down what's causing the problem
3. **Solution** (4-5s): Present and implement the fix
4. **Verify** (3-4s): Show that the problem is resolved
5. **Prevent** (2-3s): Optional - how to avoid in future

### JSON Template
```json
{
  "elements": [
    {
      "id": "problem-state",
      "type": "rectangle", 
      "x": 200, "y": 200,
      "width": 150, "height": 100,
      "backgroundColor": "#FED7D7",
      "strokeColor": "#E53E3E",
      "strokeWidth": 3,
      "label": {
        "text": "❌ Problem\nNot working",
        "fontSize": 12
      }
    },
    {
      "id": "analysis-callout",
      "type": "rectangle",
      "x": 50, "y": 50, 
      "width": 180, "height": 80,
      "backgroundColor": "#FFF5B4",
      "strokeColor": "#D69E2E",
      "label": {
        "text": "🔍 Analysis\nRoot cause identified",
        "fontSize": 11
      }
    },
    {
      "id": "solution-state",
      "type": "rectangle",
      "x": 450, "y": 200,
      "width": 150, "height": 100, 
      "backgroundColor": "#C6F6D5",
      "strokeColor": "#38A169",
      "strokeWidth": 3,
      "label": {
        "text": "✅ Solution\nNow working",
        "fontSize": 12
      }
    },
    {
      "id": "transformation-arrow",
      "type": "arrow", 
      "points": [[350, 250], [450, 250]],
      "strokeColor": "#4299E1",
      "strokeWidth": 4
    }
  ],
  "animations": [
    {
      "id": "problem-solution-flow",
      "keyframes": [
        {
          "time": 0,
          "elements": {
            "problem-state": {"opacity": 0},
            "analysis-callout": {"opacity": 0},
            "solution-state": {"opacity": 0},
            "transformation-arrow": {"opacity": 0}
          }
        },
        {
          "time": 1500,
          "elements": {"problem-state": {"opacity": 1}}
        },
        {
          "time": 4500,
          "elements": {"analysis-callout": {"opacity": 1}}
        },
        {
          "time": 8500,
          "elements": {"transformation-arrow": {"opacity": 1}}
        },
        {
          "time": 10000,
          "elements": {"solution-state": {"opacity": 1}}
        }
      ]
    }
  ]
}
```

## Pattern Selection Guidelines

### Choose Introduce → Explain → Example when:
- Teaching abstract concepts that need concrete grounding
- Audience is unfamiliar with the topic
- Concept has clear, demonstrable applications
- Need to build vocabulary and understanding

### Choose Build-up when:
- Explaining processes or systems with multiple components
- Order of assembly/creation matters
- Want to show relationships between parts
- Complexity builds naturally from simple to advanced

### Choose Compare & Contrast when:
- Multiple approaches exist for same goal
- Trade-offs need to be understood
- Audience must make decisions between options
- Common misconceptions need addressing

### Choose Problem → Solution when:
- Teaching troubleshooting skills
- Showing before/after improvements  
- Explaining why changes were necessary
- Demonstrating cause-and-effect relationships

## Hybrid Patterns

### Build-up + Compare
Show two different assembly approaches side-by-side, building each simultaneously to highlight differences at each step.

### Problem → Multiple Solutions
Present one problem with 2-3 different solution approaches, comparing their effectiveness.

### Introduce → Build-up → Example
Start with concept introduction, build the system step by step, then show real-world application.

## Anti-Patterns to Avoid

### Information Dump
- Showing too much at once without progressive revelation
- Skipping logical progression steps
- Overwhelming with technical details upfront

### Inconsistent Pacing
- Rushing through complex concepts
- Dragging out simple explanations
- Uneven step durations within same animation

### Missing Context
- Starting with advanced concepts without foundation
- Failing to connect new information to prior knowledge  
- Ending without practical application or summary

### Visual Confusion
- Too many simultaneous animations
- Inconsistent visual metaphors
- Poor color coding or visual hierarchy