#!/usr/bin/env python3
"""
OASIS Command Center Room Renderer
Renders a 1200x672px (25x14 tiles @ 48px) office room.
"""

from PIL import Image, ImageDraw
import os, json, math

T = 48  # tile size
W, H = 1200, 672  # 25x14 tiles

ASSETS = "/Users/galaxymage/DEV/FDD/resources/pixelart/extracted"
OFFICE_TS = f"{ASSETS}/Modern_Office_Revamped_v1.2/2_Modern_Office_Black_Shadow/Modern_Office_Black_Shadow_48x48.png"
FLOORS_TS = f"{ASSETS}/moderninteriors-win/1_Interiors/48x48/Room_Builder_subfiles_48x48/Room_Builder_Floors_48x48.png"
WALLS_TS  = f"{ASSETS}/moderninteriors-win/1_Interiors/48x48/Room_Builder_subfiles_48x48/Room_Builder_Walls_48x48.png"

office_ts = Image.open(OFFICE_TS).convert("RGBA")
floors_ts = Image.open(FLOORS_TS).convert("RGBA")
walls_ts  = Image.open(WALLS_TS).convert("RGBA")


def get_tile(sheet, col, row, size=48):
    return sheet.crop((col*size, row*size, (col+1)*size, (row+1)*size))

def paste_alpha(canvas, img, x, y):
    if img is None: return
    img = img.convert("RGBA")
    canvas.paste(img, (x, y), img)

def dark(color, amt=40):
    return tuple(max(0, c - amt) for c in color)

def light(color, amt=30):
    return tuple(min(255, c + amt) for c in color)


# ──────────────────────────────────────────────
# FLOOR
# ──────────────────────────────────────────────
def render_floor(canvas):
    ft  = get_tile(floors_ts, 0, 3)
    ft2 = get_tile(floors_ts, 1, 3)
    ft3 = get_tile(floors_ts, 2, 3)
    variants = [ft, ft, ft2, ft, ft3, ft2, ft]
    for ty in range(H // T):
        for tx in range(W // T):
            v = variants[(tx + ty * 3) % len(variants)]
            canvas.paste(v, (tx * T, ty * T))


# ──────────────────────────────────────────────
# WALLS
# ──────────────────────────────────────────────
def render_walls(canvas):
    WALL_ROWS = 3
    wall_mid   = get_tile(walls_ts, 6, 8)
    wall_left  = get_tile(walls_ts, 5, 8)
    wall_right = get_tile(walls_ts, 7, 8)
    wall_top_l = get_tile(walls_ts, 5, 7)
    wall_top_m = get_tile(walls_ts, 6, 7)
    wall_top_r = get_tile(walls_ts, 7, 7)
    wall_base_l = get_tile(walls_ts, 5, 9)
    wall_base_m = get_tile(walls_ts, 6, 9)
    wall_base_r = get_tile(walls_ts, 7, 9)

    for row in range(WALL_ROWS):
        for col in range(W // T):
            is_l = col == 0
            is_r = col == W // T - 1
            if row == 0:
                t = wall_top_l if is_l else (wall_top_r if is_r else wall_top_m)
            elif row == WALL_ROWS - 1:
                t = wall_base_l if is_l else (wall_base_r if is_r else wall_base_m)
            else:
                t = wall_left if is_l else (wall_right if is_r else wall_mid)
            canvas.paste(t, (col * T, row * T))

    # Darken wall to charcoal purple-gray
    wall_area = canvas.crop((0, 0, W, WALL_ROWS * T)).convert("RGBA")
    overlay   = Image.new("RGBA", (W, WALL_ROWS * T), (20, 15, 35, 170))
    wall_area = Image.alpha_composite(wall_area, overlay)
    canvas.paste(wall_area, (0, 0))

    # Purple accent strip
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([0, WALL_ROWS*T-4, W, WALL_ROWS*T+2], fill=(80, 60, 110))
    draw.rectangle([0, WALL_ROWS*T, W, WALL_ROWS*T+6], fill=(55, 40, 78))

    # Wall-floor shadow gradient
    for i in range(20):
        alpha = int(130 * (1 - i/20))
        draw.rectangle([0, WALL_ROWS*T+6+i, W, WALL_ROWS*T+7+i], fill=(0, 0, 0, alpha))


# ──────────────────────────────────────────────
# DRAW HELPERS
# ──────────────────────────────────────────────
def draw_monitor(canvas, x, y, w=120, h=80, txt_color=(30, 220, 80), bg=(10, 15, 8)):
    d = ImageDraw.Draw(canvas)
    # Stand
    d.rectangle([x+w//2-5, y+h, x+w//2+5, y+h+14], fill=(55, 55, 65))
    d.rectangle([x+w//2-18, y+h+12, x+w//2+18, y+h+16], fill=(45, 45, 55))
    # Bezel
    d.rectangle([x, y, x+w, y+h], fill=(25, 25, 38))
    # Screen
    d.rectangle([x+4, y+4, x+w-4, y+h-4], fill=bg)
    # Text lines
    for li in range(9):
        ly = y + 6 + li * 7
        lw = w - 16 if li % 3 != 2 else w - 28
        d.rectangle([x+6, ly, x+6+lw, ly+3], fill=txt_color)


def draw_monitor_art(canvas, x, y, w=120, h=80):
    d = ImageDraw.Draw(canvas)
    d.rectangle([x+w//2-5, y+h, x+w//2+5, y+h+14], fill=(55, 55, 65))
    d.rectangle([x+w//2-18, y+h+12, x+w//2+18, y+h+16], fill=(45, 45, 55))
    d.rectangle([x, y, x+w, y+h], fill=(25, 25, 38))
    d.rectangle([x+4, y+4, x+w-4, y+h-4], fill=(12, 8, 20))
    colors = [(255, 100, 150), (100, 200, 255), (255, 220, 50), (150, 255, 100), (200, 100, 255), (255, 160, 50)]
    cols_n, rows_n = 4, 3
    bw = (w-12) // cols_n
    bh = (h-10) // rows_n
    for idx in range(cols_n * rows_n):
        bx = x + 6 + (idx % cols_n) * bw
        by = y + 5 + (idx // cols_n) * bh
        d.rectangle([bx, by, bx+bw-2, by+bh-2], fill=colors[idx % len(colors)])


def draw_tablet(canvas, x, y):
    d = ImageDraw.Draw(canvas)
    d.rectangle([x, y, x+44, y+62], fill=(20, 16, 30))
    d.rectangle([x+3, y+3, x+41, y+59], fill=(30, 22, 45))
    d.rectangle([x+5, y+5, x+39, y+57], fill=(15, 10, 25))
    # Drawing on tablet (colorful abstract)
    d.ellipse([x+8, y+10, x+36, y+40], fill=(220, 80, 160))
    d.rectangle([x+6, y+42, x+38, y+47], fill=(80, 200, 255))
    d.rectangle([x+10, y+50, x+34, y+55], fill=(255, 200, 50))


def draw_desk(canvas, x, y, w, d_depth, color, accent=None):
    draw = ImageDraw.Draw(canvas)
    sc = dark(color, 35)
    draw.rectangle([x, y, x+w, y+d_depth], fill=color)
    draw.rectangle([x, y+d_depth-7, x+w, y+d_depth], fill=sc)
    draw.rectangle([x, y, x+5, y+d_depth], fill=sc)
    draw.rectangle([x+w-5, y, x+w, y+d_depth], fill=sc)
    # Drawers
    for di in range(2):
        dx = x + w//2 + di * 44 - 34
        draw.rectangle([dx, y+d_depth-20, dx+36, y+d_depth-7], fill=sc)
        draw.rectangle([dx+1, y+d_depth-19, dx+35, y+d_depth-8], fill=color)
        draw.rectangle([dx+14, y+d_depth-15, dx+22, y+d_depth-11], fill=light(color, 50))
    # Accent strip
    if accent:
        draw.rectangle([x, y, x+w, y+5], fill=accent)
    # Legs
    for lx in [x+6, x+w-10]:
        draw.rectangle([lx, y+d_depth, lx+4, y+d_depth+10], fill=(40, 40, 50))


def draw_chair(canvas, x, y, color=(80, 80, 110), sw=38, sd=28):
    draw = ImageDraw.Draw(canvas)
    # Shadow ellipse
    shadow = Image.new("RGBA", canvas.size, (0,0,0,0))
    sd2 = ImageDraw.Draw(shadow)
    sd2.ellipse([x+4, y+sd+4, x+sw+4, y+sd+12], fill=(0,0,0,50))
    canvas.paste(shadow, (0,0), shadow)
    # Base legs (radial)
    for i in range(5):
        angle = i * (360/5) * math.pi / 180
        cx, cy = x + sw//2, y + sd + 14
        ex = int(cx + 13 * math.cos(angle))
        ey = int(cy + 5  * math.sin(angle))
        draw.line([cx, cy, ex, ey], fill=(35, 35, 45), width=2)
    draw.ellipse([x+sw//2-4, y+sd+10, x+sw//2+4, y+sd+18], fill=(45, 45, 55))
    draw.rectangle([x+sw//2-3, y+sd+5, x+sw//2+3, y+sd+12], fill=(55, 55, 65))
    # Seat
    sc = dark(color, 25)
    draw.ellipse([x, y+4, x+sw, y+sd], fill=color)
    draw.ellipse([x+2, y+2, x+sw-2, y+sd-4], fill=color)
    # Backrest
    draw.rectangle([x+5, y-22, x+sw-5, y+6], fill=sc)
    draw.rectangle([x+9, y-20, x+sw-9, y+4], fill=color)
    # Armrests
    draw.rectangle([x-5, y-12, x+5, y+6], fill=sc)
    draw.rectangle([x+sw-5, y-12, x+sw+5, y+6], fill=sc)


def draw_plant_large(canvas, x, y):
    draw = ImageDraw.Draw(canvas)
    pot = (140, 100, 60)
    draw.polygon([(x+10, y+70), (x+30, y+70), (x+26, y+82), (x+14, y+82)], fill=pot)
    draw.rectangle([x+8, y+65, x+32, y+72], fill=light(pot, 20))
    draw.ellipse([x+11, y+62, x+29, y+68], fill=(50, 35, 15))
    g1 = (35, 148, 35)
    g2 = (55, 180, 55)
    g3 = (28, 118, 28)
    draw.ellipse([x+2, y+28, x+36, y+64], fill=g1)
    draw.ellipse([x-2, y+32, x+22, y+66], fill=g2)
    draw.ellipse([x+16, y+26, x+42, y+62], fill=g3)
    draw.ellipse([x+6, y+18, x+30, y+46], fill=g2)
    draw.ellipse([x+2, y+12, x+26, y+36], fill=g1)


def draw_plant_small(canvas, x, y):
    draw = ImageDraw.Draw(canvas)
    pot = (120, 90, 55)
    draw.polygon([(x+5, y+38), (x+21, y+38), (x+18, y+46), (x+8, y+46)], fill=pot)
    draw.rectangle([x+4, y+33, x+22, y+40], fill=light(pot, 20))
    draw.ellipse([x+5, y+30, x+21, y+36], fill=(45, 30, 12))
    g1 = (40, 155, 40)
    g2 = (55, 175, 55)
    draw.ellipse([x+2, y+12, x+22, y+34], fill=g1)
    draw.ellipse([x-1, y+16, x+16, y+34], fill=g2)
    draw.ellipse([x+10, y+10, x+26, y+32], fill=g1)


def draw_bookshelf(canvas, x, y, w=100, h=120):
    draw = ImageDraw.Draw(canvas)
    wd = (120, 85, 40)
    dw = (85, 58, 22)
    draw.rectangle([x, y, x+w, y+h], fill=wd)
    draw.rectangle([x+5, y+5, x+w-5, y+h-5], fill=(18, 12, 22))
    bcolors = [(210, 50, 50), (50, 110, 210), (50, 185, 50), (215, 185, 45),
               (185, 50, 185), (50, 210, 210), (240, 135, 25), (155, 55, 210),
               (240, 100, 50), (50, 200, 130), (200, 50, 100), (100, 200, 255)]
    for shelf in range(4):
        sy_base = y + 8 + shelf * (h // 4)
        draw.rectangle([x+5, sy_base+(h//4)-8, x+w-5, sy_base+(h//4)-6], fill=dw)
        bx = x + 7
        idx = shelf * 8
        while bx < x + w - 8:
            bw = 8 + (idx % 3) * 4
            bc = bcolors[idx % len(bcolors)]
            draw.rectangle([bx, sy_base+2, bx+bw, sy_base+(h//4)-9], fill=bc)
            draw.rectangle([bx, sy_base+2, bx+2, sy_base+(h//4)-9], fill=light(bc, 50))
            bx += bw + 1
            idx += 1
    draw.rectangle([x, y, x+5, y+h], fill=dw)
    draw.rectangle([x+w-5, y, x+w, y+h], fill=dw)
    draw.rectangle([x, y, x+w, y+5], fill=dw)
    draw.rectangle([x, y+h-5, x+w, y+h], fill=dw)


def draw_whiteboard(canvas, x, y, w=160, h=105):
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([x, y, x+w, y+h], fill=(75, 55, 32))
    draw.rectangle([x+5, y+5, x+w-5, y+h-5], fill=(245, 242, 228))
    # Flowchart content
    nc = [(255, 75, 75), (75, 145, 255), (75, 225, 75), (225, 185, 45), (185, 75, 225)]
    nodes = [(x+14, y+12, 42, 13), (x+82, y+10, 52, 13),
             (x+22, y+38, 40, 12), (x+88, y+36, 44, 12),
             (x+52, y+64, 48, 12)]
    for i, (nx, ny, nw, nh) in enumerate(nodes):
        draw.rectangle([nx, ny, nx+nw, ny+nh], fill=nc[i % len(nc)])
        draw.rectangle([nx, ny, nx+nw, ny+nh], outline=(40, 40, 40))
    draw.line([x+36, y+18, x+87, y+17], fill=(50, 50, 50), width=2)
    draw.line([x+36, y+25, x+36, y+38], fill=(50, 50, 50), width=2)
    draw.line([x+104, y+23, x+104, y+36], fill=(50, 50, 50), width=2)
    draw.line([x+76, y+42, x+76, y+64], fill=(50, 50, 50), width=2)
    # Text lines at bottom
    for li in range(3):
        draw.rectangle([x+10, y+82+li*6, x+10+60+li*8, y+84+li*6], fill=(100, 100, 100))
    # Tray
    draw.rectangle([x+4, y+h-10, x+w-4, y+h-5], fill=(95, 73, 42))
    # Marker
    draw.rectangle([x+12, y+h-14, x+18, y+h-5], fill=(255, 50, 50))


def draw_server_rack(canvas, x, y, w=52, h=140):
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([x, y, x+w, y+h], fill=(32, 32, 42))
    draw.rectangle([x+2, y+2, x+w-2, y+h-2], fill=(22, 22, 32))
    leds = [(255, 50, 50), (50, 255, 50), (255, 255, 50), (50, 150, 255)]
    for unit in range(11):
        uy = y + 6 + unit * 12
        draw.rectangle([x+4, uy, x+w-4, uy+10], fill=(38, 38, 52))
        for li in range(4):
            draw.rectangle([x+w-14+li*3, uy+3, x+w-12+li*3, uy+7],
                           fill=leds[(unit + li) % len(leds)])
        draw.rectangle([x+6, uy+2, x+20, uy+8], fill=(28, 28, 38))
    # Cable bundle
    for ci, cc in enumerate([(255, 80, 0), (0, 150, 255), (180, 200, 0)]):
        draw.rectangle([x+8+ci*10, y+h-10, x+12+ci*10, y+h], fill=cc)


def draw_coffee_machine(canvas, x, y):
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([x, y+10, x+44, y+62], fill=(28, 28, 35))
    draw.rectangle([x+2, y+12, x+42, y+60], fill=(42, 42, 55))
    draw.rectangle([x+4, y+6, x+40, y+14], fill=(35, 35, 45))
    draw.rectangle([x+6, y+16, x+38, y+32], fill=(0, 70, 55))
    draw.rectangle([x+8, y+18, x+36, y+30], fill=(0, 110, 75))
    for bi in range(3):
        draw.ellipse([x+8+bi*11, y+36, x+15+bi*11, y+43], fill=(90, 185, 255))
    draw.rectangle([x+8, y+50, x+36, y+60], fill=(45, 45, 58))
    draw.rectangle([x+10, y+52, x+34, y+58], fill=(28, 22, 16))
    # Cup
    draw.polygon([(x+15, y+42), (x+29, y+42), (x+27, y+54), (x+17, y+54)], fill=(238, 238, 218))
    draw.rectangle([x+16, y+43, x+28, y+47], fill=(70, 38, 8))
    draw.arc([x+26, y+44, x+34, y+52], 0, 180, fill=(238, 238, 218), width=2)


def draw_filing_cabinet(canvas, x, y, color=(115, 125, 140)):
    draw = ImageDraw.Draw(canvas)
    sc = dark(color, 30)
    draw.rectangle([x, y, x+42, y+74], fill=color)
    draw.rectangle([x+2, y+2, x+40, y+72], fill=light(color, 8))
    for di in range(3):
        dy = y + 5 + di * 23
        draw.rectangle([x+4, dy, x+38, dy+19], fill=sc)
        draw.rectangle([x+5, dy+1, x+37, dy+18], fill=color)
        draw.rectangle([x+16, dy+8, x+26, dy+12], fill=(195, 200, 218))
    draw.rectangle([x+4, y+70, x+38, y+74], fill=sc)


def draw_keyboard(canvas, x, y, color=(42, 42, 55)):
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([x, y, x+46, y+17], fill=color)
    draw.rectangle([x+1, y+1, x+45, y+16], fill=light(color, 12))
    kc = light(color, 22)
    for row in range(3):
        for col in range(11):
            kx = x + 2 + col * 4
            ky = y + 2 + row * 5
            draw.rectangle([kx, ky, kx+3, ky+4], fill=kc)


def draw_mug(canvas, x, y, color=(220, 60, 60)):
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([x+2, y+8, x+20, y+24], fill=color)
    draw.rectangle([x+3, y+9, x+19, y+23], fill=light(color, 30))
    draw.rectangle([x+2, y+6, x+20, y+10], fill=light(color, 18))
    draw.rectangle([x+4, y+8, x+18, y+13], fill=(55, 28, 8))
    draw.arc([x+16, y+11, x+24, y+21], 0, 180, fill=color, width=2)
    draw.arc([x+7, y+1, x+11, y+7], 180, 360, fill=(195, 195, 215), width=1)
    draw.arc([x+12, y+0, x+16, y+6], 180, 360, fill=(195, 195, 215), width=1)


def draw_papers(canvas, x, y):
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([x+4, y+3, x+37, y+27], fill=(215, 212, 200))
    draw.rectangle([x, y, x+33, y+25], fill=(245, 242, 228))
    for li in range(4):
        draw.rectangle([x+3, y+4+li*5, x+29, y+5+li*5], fill=(145, 145, 158))


def draw_wall_art(canvas, x, y, w=62, h=54):
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([x, y, x+w, y+h], fill=(58, 43, 28))
    draw.rectangle([x+4, y+4, x+w-4, y+h-4], fill=(30, 18, 48))
    colors_art = [(180, 50, 80), (50, 120, 200), (200, 180, 50), (100, 200, 100)]
    for i, c in enumerate(colors_art):
        bx = x + 6 + (i % 2) * ((w-14)//2)
        by = y + 6 + (i // 2) * ((h-12)//2)
        draw.polygon([(bx, by+8), (bx+8, by), (bx+16, by+8), (bx+8, by+16)], fill=c)


def draw_certificate(canvas, x, y):
    draw = ImageDraw.Draw(canvas)
    draw.rectangle([x, y, x+58, y+48], fill=(148, 118, 58))
    draw.rectangle([x+3, y+3, x+55, y+45], fill=(242, 238, 212))
    draw.rectangle([x+6, y+6, x+52, y+28], fill=(198, 58, 58))
    draw.rectangle([x+8, y+8, x+50, y+26], fill=(218, 78, 78))
    for li in range(3):
        draw.rectangle([x+8, y+32+li*5, x+50, y+33+li*5], fill=(100, 100, 105))
    # Seal
    draw.ellipse([x+22, y+30, x+36, y+44], fill=(218, 178, 38))
    draw.ellipse([x+24, y+32, x+34, y+42], fill=(238, 198, 58))


# ──────────────────────────────────────────────
# RENDER ROOM
# ──────────────────────────────────────────────
def render_room():
    canvas = Image.new("RGBA", (W, H), (255, 255, 255, 255))

    # ── 1. FLOOR ──
    print("Rendering floor...")
    render_floor(canvas)

    # ── 2. WALLS ──
    print("Rendering walls...")
    render_walls(canvas)

    draw = ImageDraw.Draw(canvas)

    # ── 3. WALL ITEMS ──
    print("Rendering wall items...")
    WALL_Y = 5   # items on wall start here (top of wall area)

    # Bookshelf (left wall)
    draw_bookshelf(canvas, x=30, y=WALL_Y+5, w=105, h=118)
    draw_plant_small(canvas, x=12, y=WALL_Y+12)  # plant beside bookshelf

    # Whiteboard (center)
    draw_whiteboard(canvas, x=W//2-85, y=WALL_Y+2, w=170, h=112)

    # Server rack (right wall)
    draw_server_rack(canvas, x=W-82, y=WALL_Y+2, w=58, h=128)

    # Wall art paintings
    draw_wall_art(canvas, x=155, y=WALL_Y+14, w=68, h=58)

    # Certificates (right side of wall)
    draw_certificate(canvas, x=W-220, y=WALL_Y+14)
    draw_certificate(canvas, x=W-155, y=WALL_Y+14)

    # Small plant on wall shelf area near server
    draw_plant_small(canvas, x=W-145, y=WALL_Y+28)

    # ── 4. WORKSTATIONS ──
    print("Rendering workstations...")
    DESK_Y  = 270   # y of desk top surface (moved down for better balance)
    CHAIR_Y = DESK_Y + 62  # y of chair center
    DESK_D  = 56    # desk depth

    # ═══ FORGE (LEFT) — RED ACCENT ═══
    FX = 55
    FC = (68, 55, 62)
    FA = (205, 55, 55)

    draw_desk(canvas, FX, DESK_Y, w=200, d_depth=DESK_D, color=FC, accent=FA)
    # Monitor
    draw_monitor(canvas, FX+18, DESK_Y-90, w=150, h=88, txt_color=(255, 80, 80), bg=(12, 4, 4))
    # Desk props
    draw_keyboard(canvas, FX+22, DESK_Y+30, color=(38, 30, 30))
    draw_mug(canvas, FX+165, DESK_Y+14, color=(185, 48, 48))
    draw_papers(canvas, FX+75, DESK_Y+22)
    # Nameplate strip color indicator
    draw.rectangle([FX+5, DESK_Y+8, FX+22, DESK_Y+16], fill=FA)
    # Chair
    draw_chair(canvas, FX+72, CHAIR_Y, color=(65, 50, 50), sw=40, sd=30)

    # ═══ PERCIVAL (CENTER) — PURPLE ACCENT ═══
    PX = W//2 - 152
    PC = (60, 52, 82)
    PA = (128, 78, 210)

    draw_desk(canvas, PX, DESK_Y, w=304, d_depth=DESK_D+8, color=PC, accent=PA)
    # TRIPLE monitors
    draw_monitor(canvas, PX+14, DESK_Y-98, w=128, h=84, txt_color=(100, 210, 255))
    draw_monitor(canvas, PX+102, DESK_Y-108, w=148, h=94, txt_color=(80, 255, 130))  # center biggest
    draw_monitor(canvas, PX+212, DESK_Y-98, w=128, h=84, txt_color=(200, 145, 255))
    # Desk props
    draw_keyboard(canvas, PX+110, DESK_Y+32, color=(48, 42, 68))
    draw_mug(canvas, PX+272, DESK_Y+18, color=(128, 78, 210))
    draw_mug(canvas, PX+18, DESK_Y+20, color=(95, 60, 155))
    draw_papers(canvas, PX+52, DESK_Y+25)
    draw_papers(canvas, PX+220, DESK_Y+28)
    draw.rectangle([PX+5, DESK_Y+10, PX+22, DESK_Y+18], fill=PA)
    # Executive chair (bigger, more prominent)
    draw_chair(canvas, PX+122, CHAIR_Y+8, color=(95, 58, 128), sw=48, sd=36)

    # ═══ SPRITE (RIGHT) — PINK ACCENT ═══
    SX = W - 268
    SC = (72, 58, 88)
    SA = (222, 78, 162)

    draw_desk(canvas, SX, DESK_Y, w=200, d_depth=DESK_D, color=SC, accent=SA)
    # Monitor (art)
    draw_monitor_art(canvas, SX+8, DESK_Y-88, w=138, h=84)
    # Tablet/drawing pad
    draw_tablet(canvas, SX+152, DESK_Y-48)
    # Desk props
    draw_keyboard(canvas, SX+28, DESK_Y+28, color=(85, 48, 78))
    draw_mug(canvas, SX+8, DESK_Y+14, color=(222, 78, 162))
    draw_papers(canvas, SX+95, DESK_Y+22)
    # Colorful markers
    for pi, pc in enumerate([(255, 48, 78), (78, 148, 255), (48, 225, 100)]):
        draw.rectangle([SX+108+pi*12, DESK_Y+9, SX+112+pi*12, DESK_Y+30], fill=pc)
    draw.rectangle([SX+5, DESK_Y+8, SX+22, DESK_Y+16], fill=SA)
    # Chair
    draw_chair(canvas, SX+72, CHAIR_Y, color=(178, 78, 132), sw=40, sd=30)

    # ── 4b. FLOOR RUG (under the workstations area) ──
    # Dark area rug to anchor the workspace
    rug = Image.new("RGBA", (W-140, 310), (0,0,0,0))
    rd = ImageDraw.Draw(rug)
    # Rug body - dark charcoal with subtle pattern
    rd.rectangle([0, 0, W-141, 309], fill=(38, 32, 52, 200))
    # Rug border pattern
    rd.rectangle([0, 0, W-141, 309], outline=(75, 60, 100, 180), width=6)
    rd.rectangle([8, 8, W-149, 301], outline=(55, 45, 80, 140), width=3)
    canvas.paste(rug, (70, DESK_Y-30), rug)

    # ── 5. FLOOR PROPS ──
    print("Rendering floor props...")

    # Filing cabinets between forge and percival
    draw_filing_cabinet(canvas, x=310, y=DESK_Y+18, color=(108, 118, 132))
    draw_filing_cabinet(canvas, x=358, y=DESK_Y+18, color=(95, 108, 120))

    # Extra filing between percival and sprite
    draw_filing_cabinet(canvas, x=W//2+165, y=DESK_Y+18, color=(105, 115, 130))

    # Coffee area (bottom-left)
    CX, CY = 30, H - 138
    draw.rectangle([CX, CY+35, CX+88, CY+78], fill=(95, 72, 42))
    draw.rectangle([CX+2, CY+37, CX+86, CY+76], fill=(112, 88, 52))
    draw_coffee_machine(canvas, CX+10, CY+2)
    draw_mug(canvas, CX+60, CY+40, color=(242, 242, 225))
    draw_mug(canvas, CX+68, CY+52, color=(200, 80, 80))

    # Plants (floor, spread around room)
    draw_plant_large(canvas, x=288, y=H-165)         # between forge and percival
    draw_plant_large(canvas, x=W//2+158, y=H-170)   # between percival and sprite
    draw_plant_large(canvas, x=W-75, y=H-155)       # bottom-right corner
    draw_plant_small(canvas, x=CX+88, y=H-118)      # near coffee
    draw_plant_small(canvas, x=32, y=DESK_Y+85)     # left wall near forge

    # Meeting/lounge area - center bottom
    MX, MY = W//2 - 110, H - 135
    # Larger conference table
    draw.rectangle([MX, MY+18, MX+220, MY+58], fill=(88, 70, 45))
    draw.rectangle([MX+3, MY+20, MX+217, MY+56], fill=(115, 92, 58))
    draw.rectangle([MX+4, MY+21, MX+216, MY+24], fill=(130, 105, 65))  # edge highlight
    # Items on table
    draw.rectangle([MX+75, MY+22, MX+145, MY+40], fill=(32, 28, 45))
    draw.rectangle([MX+77, MY+24, MX+143, MY+38], fill=(0, 115, 75))
    draw_mug(canvas, MX+155, MY+22, color=(210, 210, 210))
    draw_mug(canvas, MX+22, MY+24, color=(100, 180, 255))
    draw_papers(canvas, MX+165, MY+30)
    draw_papers(canvas, MX+38, MY+32)
    # Meeting chairs around table
    draw_chair(canvas, MX+82, MY+60, color=(58, 52, 78), sw=36, sd=26)
    draw_chair(canvas, MX+142, MY+60, color=(58, 52, 78), sw=36, sd=26)

    # Printer station (right of filing cabinets)
    PNX = W//2 + 175
    draw.rectangle([PNX, DESK_Y+18, PNX+58, DESK_Y+48], fill=(92, 95, 108))
    draw.rectangle([PNX+2, DESK_Y+20, PNX+56, DESK_Y+46], fill=(108, 112, 125))
    draw.rectangle([PNX+6, DESK_Y+22, PNX+52, DESK_Y+34], fill=(78, 82, 95))
    draw.rectangle([PNX+8, DESK_Y+36, PNX+50, DESK_Y+42], fill=(85, 88, 102))
    # Paper output tray
    draw.rectangle([PNX+10, DESK_Y+40, PNX+48, DESK_Y+48], fill=(238, 235, 220))

    # Trash cans
    for tx, ty in [(FX+195, CHAIR_Y+50), (SX-20, CHAIR_Y+50)]:
        draw.ellipse([tx, ty+8, tx+18, ty+24], fill=(45, 45, 55))
        draw.rectangle([tx+2, ty, tx+16, ty+20], fill=(52, 52, 65))
        draw.rectangle([tx+2, ty, tx+16, ty+4], fill=(62, 62, 75))

    # Backpack/bag by forge chair
    draw.ellipse([FX+42, CHAIR_Y+52, FX+66, CHAIR_Y+74], fill=(185, 48, 48))
    draw.rectangle([FX+44, CHAIR_Y+52, FX+64, CHAIR_Y+70], fill=(185, 48, 48))
    draw.rectangle([FX+48, CHAIR_Y+50, FX+60, CHAIR_Y+58], fill=(165, 38, 38))

    # Bag by sprite chair
    draw.ellipse([SX+135, CHAIR_Y+52, SX+162, CHAIR_Y+72], fill=(220, 78, 162))
    draw.rectangle([SX+137, CHAIR_Y+52, SX+160, CHAIR_Y+70], fill=(220, 78, 162))

    # Ceiling light fixtures (subtle circular indicators on wall top)
    for lx in [FX+100, W//2, SX+100]:
        draw.ellipse([lx-12, 2, lx+12, 14], fill=(255, 240, 180))
        draw.ellipse([lx-8, 4, lx+8, 12], fill=(255, 255, 220))

    # Water cooler (right side, near server area)
    WCX, WCY = W-145, H-155
    draw.rectangle([WCX, WCY+15, WCX+28, WCY+62], fill=(85, 95, 115))
    draw.rectangle([WCX+2, WCY+17, WCX+26, WCY+60], fill=(100, 112, 132))
    # Water tank (blue cylinder)
    draw.ellipse([WCX+4, WCY, WCX+24, WCY+22], fill=(120, 180, 240))
    draw.ellipse([WCX+5, WCY+2, WCX+23, WCY+20], fill=(140, 200, 255))
    # Tap
    draw.rectangle([WCX+8, WCY+38, WCX+20, WCY+46], fill=(75, 85, 105))
    draw.rectangle([WCX+10, WCY+44, WCX+18, WCY+54], fill=(200, 50, 50))

    # Whiteboard easel (center of room, below main whiteboard)
    EX, EY = W//2 + 50, H - 195
    # Easel legs
    draw.line([EX, EY, EX+20, EY+55], fill=(80, 65, 40), width=3)
    draw.line([EX+36, EY, EX+16, EY+55], fill=(80, 65, 40), width=3)
    draw.line([EX+10, EY+35, EX+26, EY+35], fill=(80, 65, 40), width=2)
    # Board
    draw.rectangle([EX-2, EY-5, EX+38, EY+32], fill=(68, 50, 28))
    draw.rectangle([EX+1, EY-3, EX+35, EY+30], fill=(238, 235, 218))
    # Content on easel board
    draw.rectangle([EX+3, EY, EX+33, EY+20], fill=(240, 238, 220))
    for li in range(4):
        clr = [(255,80,80),(80,150,255),(80,220,80),(220,180,50)][li]
        draw.rectangle([EX+4, EY+1+li*5, EX+4+20+(li%2)*8, EY+3+li*5], fill=clr)

    # Extra plant in bottom center area (by easel)
    draw_plant_small(canvas, x=W//2+90, y=H-120)

    # Cable run on floor (decorative, near server)
    for ci in range(0, 60, 8):
        draw.rectangle([W-110, H-220+ci, W-105, H-215+ci], fill=(50, 80, 50))

    # Scatter some floor-level items in empty areas
    # Papers dropped near forge chair
    draw.rectangle([FX+14, CHAIR_Y+70, FX+44, CHAIR_Y+84], fill=(238, 235, 218))
    draw.rectangle([FX+18, CHAIR_Y+68, FX+48, CHAIR_Y+82], fill=(245, 242, 225))
    # Sticky note on desk edge (forge)
    draw.rectangle([FX+170, DESK_Y+40, FX+198, DESK_Y+55], fill=(255, 240, 50))
    draw.rectangle([FX+172, DESK_Y+42, FX+196, DESK_Y+53], fill=(255, 245, 80))
    # Sticky note (sprite)
    draw.rectangle([SX+170, DESK_Y+40, SX+198, DESK_Y+55], fill=(220, 78, 162))
    draw.rectangle([SX+172, DESK_Y+42, SX+196, DESK_Y+53], fill=(235, 100, 178))

    # ── 6. LIGHTING OVERLAY ──
    print("Rendering lighting...")
    light_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(light_layer)

    # Workstation spotlights (from ceiling)
    for lx, ly, lr, lc in [
        (FX + 100,  DESK_Y - 20, 150, (255, 215, 110)),
        (W//2,      DESK_Y - 25, 195, (255, 225, 130)),
        (SX + 100,  DESK_Y - 20, 150, (255, 200, 180)),
    ]:
        for r in range(lr, 0, -6):
            alpha = int(28 * (1 - r/lr))
            ld.ellipse([lx-r, ly-r, lx+r, ly+r], fill=(*lc, alpha))

    # Monitor glow on desks - green/blue glow from screens onto desk surface
    # Forge monitor (red glow)
    for r in range(90, 0, -5):
        alpha = int(20 * (1 - r/90))
        ld.ellipse([FX+18-r//3, DESK_Y-90-r//3, FX+168+r//3, DESK_Y+r//3], fill=(255, 80, 80, alpha))

    # Percival center monitor (green glow)
    for r in range(120, 0, -6):
        alpha = int(18 * (1 - r/120))
        ld.ellipse([PX+102-r//3, DESK_Y-108-r//3, PX+250+r//3, DESK_Y+r//3], fill=(80, 255, 130, alpha))

    # Sprite monitor (pink glow)
    for r in range(90, 0, -5):
        alpha = int(20 * (1 - r/90))
        ld.ellipse([SX+8-r//3, DESK_Y-88-r//3, SX+146+r//3, DESK_Y+r//3], fill=(255, 100, 200, alpha))

    # Ambient ceiling glow
    for r in range(380, 0, -14):
        alpha = int(10 * (1 - r/380))
        ld.ellipse([W//2-r, H//2-r-60, W//2+r, H//2+r-60], fill=(255, 200, 100, alpha))

    canvas = Image.alpha_composite(canvas, light_layer)

    # ── 7. VIGNETTE ──
    vignette = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vignette)
    for step in range(90):
        alpha = int(110 * (step/90) ** 1.8)
        if step < W//2 and step < H//2:
            vd.rectangle([step, step, W-step, H-step], outline=(0, 0, 0, max(0, alpha)))
    canvas = Image.alpha_composite(canvas, vignette)

    return canvas


# ──────────────────────────────────────────────
# POSITIONS JSON
# ──────────────────────────────────────────────
def generate_positions():
    DESK_Y  = 270
    CHAIR_Y = DESK_Y + 62
    FX = 55
    PX = W//2 - 152
    SX = W - 268

    return {
        "forge_desk":     {"x": FX + 100, "y": DESK_Y + 28},
        "forge_chair":    {"x": FX + 92,  "y": CHAIR_Y + 15},
        "percival_desk":  {"x": PX + 152, "y": DESK_Y + 32},
        "percival_chair": {"x": PX + 146, "y": CHAIR_Y + 24},
        "sprite_desk":    {"x": SX + 100, "y": DESK_Y + 28},
        "sprite_chair":   {"x": SX + 92,  "y": CHAIR_Y + 15},
        "whiteboard":     {"x": W//2,      "y": 58},
        "server_rack":    {"x": W - 53,    "y": 66},
        "coffee":         {"x": 74,        "y": H - 100},
        "door":           {"x": W//2,      "y": H - 24},
        "waypoints": [
            {"x": W//2,      "y": H - 52},
            {"x": W//4,      "y": H - 85},
            {"x": 3*W//4,    "y": H - 85},
            {"x": FX + 100,  "y": CHAIR_Y + 65},
            {"x": PX + 152,  "y": CHAIR_Y + 75},
            {"x": SX + 100,  "y": CHAIR_Y + 65},
            {"x": W//2,      "y": H//2 + 55},
            {"x": 74,        "y": H - 60},
        ]
    }


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────
if __name__ == "__main__":
    print("🧚 Sprite: Iniciando render del OASIS Command Center...")

    room = render_room()

    out_dir = "/Users/galaxymage/dev/fdd/oasis-mission-control/public/assets/room"
    os.makedirs(out_dir, exist_ok=True)

    out_path     = f"{out_dir}/office-room.png"
    preview_path = "/Users/galaxymage/.openclaw/workspace/office-room-sprite.png"

    room.save(out_path)
    room.save(preview_path)
    print(f"✅ Room saved: {out_path}")
    print(f"✅ Preview: {preview_path}")

    positions = generate_positions()
    with open(f"{out_dir}/positions.json", "w") as f:
        json.dump(positions, f, indent=2)
    print(f"✅ Positions saved")
    print(f"🎨 Room size: {room.size}")
    print("🧚 Done! OASIS Command Center ready.")
