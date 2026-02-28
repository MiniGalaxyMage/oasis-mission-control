#!/usr/bin/env python3
"""
OASIS Room Renderer — Renders a room from a JSON layout definition using LimeZu tilesets.

Usage:
  python3 render_room.py <layout.json> [--output room.png] [--positions positions.json]

The layout JSON describes what goes where:
{
  "width": 25,          // tiles
  "height": 14,         // tiles
  "tile_size": 48,      // px per tile
  "floor": { "type": "wood_dark", "source": "floors", "col": 0, "row": 4, "alt_col": 2 },
  "walls": { "color": [48, 40, 58], "height_tiles": 3, "texture": "brick" },
  "items": [
    { "name": "forge_desk", "catalog": "desks.grey_wide", "tx": 2, "ty": 6 },
    { "name": "monitor_1", "catalog": "monitors.blue_large", "tx": 3, "ty": 5 },
    ...
  ],
  "lighting": { "spotlights": [[4, 6], [12, 6], [20, 6]], "warmth": 8, "vignette": true }
}

This script uses tile-catalog.json to resolve catalog references.
"""
import json, os, sys
from PIL import Image, ImageDraw

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
ASSETS_DIR = os.path.join(PROJECT_DIR, "src", "assets", "tilesets")
CATALOG_PATH = os.path.join(ASSETS_DIR, "tile-catalog.json")

# External asset paths
EXTRACTED = os.path.expanduser("~/DEV/FDD/resources/pixelart/extracted")
TILESHEETS = {
    "office": f"{EXTRACTED}/Modern_Office_Revamped_v1.2/2_Modern_Office_Black_Shadow/Modern_Office_Black_Shadow_48x48.png",
    "office_shadowless": f"{EXTRACTED}/Modern_Office_Revamped_v1.2/3_Modern_Office_Shadowless/Modern_Office_Shadowless_48x48.png",
    "office_room_builder": f"{EXTRACTED}/Modern_Office_Revamped_v1.2/1_Room_Builder_Office/Room_Builder_Office_48x48.png",
    "floors": f"{EXTRACTED}/moderninteriors-win/1_Interiors/48x48/Room_Builder_subfiles_48x48/Room_Builder_Floors_48x48.png",
    "walls": f"{EXTRACTED}/moderninteriors-win/1_Interiors/48x48/Room_Builder_subfiles_48x48/Room_Builder_Walls_48x48.png",
    "generic": f"{EXTRACTED}/moderninteriors-win/1_Interiors/48x48/Theme_Sorter_48x48/1_Generic_48x48.png",
    "classroom": f"{EXTRACTED}/moderninteriors-win/1_Interiors/48x48/Theme_Sorter_48x48/5_Classroom_and_library_48x48.png",
    "art": f"{EXTRACTED}/moderninteriors-win/1_Interiors/48x48/Theme_Sorter_48x48/7_Art_48x48.png",
    "kitchen": f"{EXTRACTED}/moderninteriors-win/1_Interiors/48x48/Theme_Sorter_48x48/12_Kitchen_48x48.png",
}

# Load catalog
with open(CATALOG_PATH) as f:
    CATALOG = json.load(f)

# Cache loaded tilesheets
_sheets = {}

def get_sheet(name):
    if name not in _sheets:
        path = TILESHEETS.get(name)
        if not path or not os.path.exists(path):
            raise FileNotFoundError(f"Tilesheet '{name}' not found at {path}")
        _sheets[name] = Image.open(path).convert("RGBA")
    return _sheets[name]

def extract_tile(sheet_name, col, row, w=1, h=1, tile_size=48):
    """Extract a block of tiles from a tilesheet."""
    sheet = get_sheet(sheet_name)
    T = tile_size
    return sheet.crop((col * T, row * T, (col + w) * T, (row + h) * T))

def resolve_catalog(ref):
    """Resolve a dotted catalog reference like 'desks.grey_wide' to tile params."""
    parts = ref.split(".")
    obj = CATALOG
    for p in parts:
        if isinstance(obj, dict) and p in obj:
            obj = obj[p]
        else:
            raise KeyError(f"Catalog reference '{ref}' not found")
    return obj

def render_floor(room, layout, T):
    """Render floor tiles."""
    floor = layout.get("floor", {})
    sheet = floor.get("source", "floors")
    col = floor.get("col", 0)
    row = floor.get("row", 4)
    alt_col = floor.get("alt_col", col + 2)
    
    f1 = extract_tile(sheet, col, row, 1, 1, T)
    f2 = extract_tile(sheet, alt_col, row, 1, 1, T)
    
    W = layout["width"]
    H = layout["height"]
    for y in range(H):
        for x in range(W):
            tile = f1 if (x + y) % 2 == 0 else f2
            room.paste(tile, (x * T, y * T), tile)

def render_walls(room, layout, T):
    """Render walls with texture and molding."""
    walls = layout.get("walls", {})
    color = tuple(walls.get("color", [48, 40, 58]))
    height = walls.get("height_tiles", 3) * T
    W = layout["width"] * T
    H = layout["height"] * T
    
    draw = ImageDraw.Draw(room)
    
    # Top wall
    draw.rectangle([0, 0, W, height], fill=color)
    
    # Brick texture
    if walls.get("texture") == "brick":
        dc = tuple(c + 4 for c in color)
        for yy in range(0, height - 8, 16):
            draw.line([(0, yy), (W, yy)], fill=dc, width=1)
            off = 24 if (yy // 16) % 2 else 0
            for xx in range(off, W, 48):
                draw.line([(xx, yy), (xx, yy + 15)], fill=dc, width=1)
    
    # Molding
    lc = tuple(min(255, c + 14) for c in color)
    dc = tuple(max(0, c - 10) for c in color)
    draw.rectangle([0, height - 7, W, height - 4], fill=lc)
    draw.rectangle([0, height - 4, W, height], fill=dc)
    
    # Side walls
    sw = walls.get("side_width", 20)
    sc = tuple(max(0, c - 6) for c in color)
    draw.rectangle([0, 0, sw, H], fill=sc)
    draw.rectangle([W - sw, 0, W, H], fill=sc)
    draw.line([(sw, height), (sw, H)], fill=dc, width=2)
    draw.line([(W - sw, height), (W - sw, H)], fill=dc, width=2)
    
    # Bottom baseboard
    draw.rectangle([0, H - 8, W, H], fill=dc)
    draw.rectangle([0, H - 12, W, H - 8], fill=lc)

def render_items(room, layout, T, positions):
    """Render items from the layout, sorted by Y for depth."""
    items = layout.get("items", [])
    sheet_name = layout.get("item_sheet", "office")
    
    # Sort by ty (top to bottom) for depth
    sorted_items = sorted(items, key=lambda i: i.get("ty", 0))
    
    for item in sorted_items:
        name = item.get("name", "")
        tx, ty = item.get("tx", 0), item.get("ty", 0)
        
        # Get tile info from catalog or direct coords
        if "catalog" in item:
            info = resolve_catalog(item["catalog"])
            col, row = info["col"], info["row"]
            w = info.get("w", 1)
            h = info.get("h", 1)
            source = item.get("source", sheet_name)
        else:
            col = item.get("col", 0)
            row = item.get("row", 0)
            w = item.get("w", 1)
            h = item.get("h", 1)
            source = item.get("source", sheet_name)
        
        tile_img = extract_tile(source, col, row, w, h, T)
        
        # Pixel offset support
        ox = item.get("ox", 0)
        oy = item.get("oy", 0)
        
        px = tx * T + ox
        py = ty * T + oy
        room.paste(tile_img, (int(px), int(py)), tile_img)
        
        # Record position if named
        if name and not name.startswith("_"):
            positions[name] = {
                "x": int(px + (w * T) // 2),
                "y": int(py + (h * T) // 2)
            }

def render_lighting(room, layout, T):
    """Add lighting effects."""
    lighting = layout.get("lighting", {})
    W, H = room.size
    
    # Spotlights
    light = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ldraw = ImageDraw.Draw(light)
    warmth = lighting.get("warmth", 8)
    wall_h = layout.get("walls", {}).get("height_tiles", 3) * T
    
    for cx_tile, cy_tile in lighting.get("spotlights", []):
        cx = cx_tile * T
        for i in range(15):
            r = 30 + i * 12
            a = max(0, warmth - i)
            ldraw.ellipse([cx - r, wall_h - r // 3, cx + r, wall_h + r], fill=(255, 235, 200, a))
    
    # Ambient
    for i in range(15):
        r = 80 + i * 25
        a = max(0, 4 - i // 3)
        ldraw.ellipse([W // 2 - r, H // 2 - r // 2, W // 2 + r, H // 2 + r // 2], fill=(255, 245, 220, a))
    
    room_out = Image.alpha_composite(room, light)
    
    # Wall shadow
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sw = layout.get("walls", {}).get("side_width", 20)
    sdraw.rectangle([sw, wall_h, W - sw, wall_h + 6], fill=(0, 0, 0, 25))
    room_out = Image.alpha_composite(room_out, shadow)
    
    # Vignette
    if lighting.get("vignette", True):
        vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for i in range(15):
            m = 15 - i
            ImageDraw.Draw(vig).rectangle([m, m, W - m, H - m], outline=(0, 0, 0, i + 1))
        room_out = Image.alpha_composite(room_out, vig)
    
    return room_out

def render_room(layout):
    """Main render function. Returns (room_image, positions_dict)."""
    T = layout.get("tile_size", 48)
    W = layout["width"] * T
    H = layout["height"] * T
    
    room = Image.new("RGBA", (W, H), (20, 18, 30, 255))
    positions = {}
    
    # Layer 1: Floor
    render_floor(room, layout, T)
    
    # Layer 2: Walls
    render_walls(room, layout, T)
    
    # Layer 3-5: Items (furniture, wall items, desk props — sorted by Y)
    render_items(room, layout, T, positions)
    
    # Layer 6-7: Lighting
    room = render_lighting(room, layout, T)
    
    return room, positions

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 render_room.py <layout.json> [--output room.png] [--positions positions.json]")
        sys.exit(1)
    
    layout_path = sys.argv[1]
    output_path = "room.png"
    positions_path = "positions.json"
    
    for i, arg in enumerate(sys.argv):
        if arg == "--output" and i + 1 < len(sys.argv):
            output_path = sys.argv[i + 1]
        elif arg == "--positions" and i + 1 < len(sys.argv):
            positions_path = sys.argv[i + 1]
    
    with open(layout_path) as f:
        layout = json.load(f)
    
    room, positions = render_room(layout)
    
    room.save(output_path)
    with open(positions_path, "w") as f:
        json.dump(positions, f, indent=2)
    
    print(f"✅ Room: {room.size} → {output_path}")
    print(f"📍 Positions: {len(positions)} items → {positions_path}")

if __name__ == "__main__":
    main()
