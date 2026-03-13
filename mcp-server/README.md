# Animate-Excalidraw MCP Server

MCP server for creating Excalidraw designs and animating them with keyframes. Designed for AI agent integration (Claude Desktop, Copilot CLI, etc.).

## Features

- **22 tools** for scene creation, animation, camera control, export, and checkpointing
- **Dual transport**: stdio (Claude Desktop) + Streamable HTTP (cloud deployment)
- **Sequence reveal**: Staggered element reveal animations in one tool call
- **Camera animation**: Pan/zoom keyframes for cinematic effects
- **Checkpoint persistence**: Save/load complete scene + animation state

## Quick Start

```bash
# Install
cd mcp-server
npm install

# Build
npm run build

# Run (stdio for Claude Desktop)
node dist/index.js --stdio

# Run (HTTP for cloud)
node dist/index.js
# → http://localhost:3001/mcp
```

## Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "animate-excalidraw": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js", "--stdio"]
    }
  }
}
```

## Tools

### Scene Tools
| Tool | Description |
|------|-------------|
| `read_me` | Element format reference + animation docs |
| `get_examples` | Few-shot examples for elements and animations |
| `create_scene` | Create/replace scene from elements JSON |
| `add_elements` | Add elements to existing scene |
| `remove_elements` | Remove elements by ID |
| `update_elements` | Modify element properties |
| `get_scene` | Return current scene as JSON |
| `clear_scene` | Clear all elements and animations |
| `delete_items` | Remove specific elements + their animation tracks |

### Animation Tools
| Tool | Description |
|------|-------------|
| `add_keyframe` | Add keyframe (auto-creates track) |
| `add_keyframes_batch` | Bulk add keyframes |
| `remove_keyframe` | Remove a keyframe |
| `create_sequence` | Staggered reveal animation |
| `set_clip_range` | Set export start/end times |
| `get_timeline` | Return timeline as JSON |
| `clear_animation` | Clear all tracks |

### Camera Tools
| Tool | Description |
|------|-------------|
| `set_camera_frame` | Set camera position/size/aspect + creates t=0 keyframes |
| `add_camera_keyframe` | Animate camera pan/zoom |
| `add_camera_keyframes_batch` | Bulk camera keyframes |

### Inspection Tools
| Tool | Description |
|------|-------------|
| `are_items_in_line` | Check horizontal/vertical alignment |
| `is_camera_centered` | Check if camera is centered on content |
| `items_visible_in_camera` | Report visibility of items at a given time |
| `animations_of_item` | Describe all animations of an element |

### Checkpoint Tools
| Tool | Description |
|------|-------------|
| `save_checkpoint` | Save scene + animation state |
| `load_checkpoint` | Restore from checkpoint |
| `list_checkpoints` | List saved checkpoints |

## Example Workflow

```
1. read_me                     → Get element format reference
2. create_scene {elements}     → Create a diagram
3. create_sequence {           → Animate elements revealing one by one
     elementIds: ["box1", "arrow1", "box2"],
     property: "opacity",
     startTime: 0,
     delay: 500,
     duration: 800
   }
4. set_clip_range {0, 5000}    → Set 5-second export window
5. save_checkpoint {id: "demo"} → Save for web app preview
```
