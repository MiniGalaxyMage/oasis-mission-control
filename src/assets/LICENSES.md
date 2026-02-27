# LICENSES — Assets de OASIS Mission Control

## Tileset de Castillo

| Campo | Valor |
|-------|-------|
| **Nombre** | Tiny Dungeon (1.0) |
| **Autor** | Kenney (www.kenney.nl) |
| **URL** | https://kenney.nl/assets/tiny-dungeon |
| **Licencia** | Creative Commons Zero (CC0 1.0) |
| **Uso** | Libre para proyectos personales, educativos y comerciales |
| **Archivos** | `tiles/castle-tileset.png`, `tiles/castle-tileset-unpacked.png` |

> Licencia CC0: https://creativecommons.org/publicdomain/zero/1.0/
>
> No es obligatorio acreditar a Kenney, pero se agradece.

---

## Sprites de Personajes (generados proceduralmente)

Los sprites de personajes fueron generados programáticamente con Python/Pillow
mediante scripts de pixel art personalizados para este proyecto.

| Archivo | Descripción | Autor | Licencia |
|---------|-------------|-------|----------|
| `sprites/percival-idle.png` | Mago Percival — spritesheet 192×48 (4 frames idle) | Generado por Sprite Agent (OpenClaw) | MIT / Libre uso |
| `sprites/forge-idle.png` | Herrero Forge — spritesheet 192×48 (4 frames idle) | Generado por Sprite Agent (OpenClaw) | MIT / Libre uso |
| `sprites/forge-working.png` | Herrero Forge — spritesheet 192×48 (4 frames martilleo) | Generado por Sprite Agent (OpenClaw) | MIT / Libre uso |
| `sprites/sprite-idle.png` | Hada Sprite — spritesheet 128×32 (4 frames idle) | Generado por Sprite Agent (OpenClaw) | MIT / Libre uso |

**Nota sobre Gemini API:** Se intentó generar sprites con la API de Gemini (gemini-2.5-flash-image, gemini-3.1-flash-image-preview, imagen-4.0), pero todos los modelos de generación de imágenes requieren plan de pago (free tier = 0 requests). Se optó por generación procedural con Pillow, que produce pixel art auténtico pixel a pixel.

---

## Objetos de la Habitación (generados proceduralmente)

| Archivo | Descripción | Autor | Licencia |
|---------|-------------|-------|----------|
| `objects/anvil.png` | Yunque — 32×32 | Generado por Sprite Agent (OpenClaw) | MIT / Libre uso |
| `objects/strategy-table.png` | Mesa de estrategia — 64×48 | Generado por Sprite Agent (OpenClaw) | MIT / Libre uso |
| `objects/treasure-chest.png` | Cofre (2 frames: cerrado+abierto) — 64×32 | Generado por Sprite Agent (OpenClaw) | MIT / Libre uso |
| `objects/easel.png` | Caballete — 32×48 | Generado por Sprite Agent (OpenClaw) | MIT / Libre uso |

---

## Herramienta de generación

- **Python** 3.x con librería **Pillow** (PIL)
- Script: `gen_sprites.py` (disponible en `/tmp/gen_sprites.py` durante la generación)
- Estilo: Pixel art 16-bit SNES RPG, paleta personalizada, fondo transparente (RGBA)
- Todos los assets tienen fondo 100% transparente y son RGBA

---

*Generado el 2026-02-27 por el agente Sprite (OpenClaw / OASIS Mission Control)*
