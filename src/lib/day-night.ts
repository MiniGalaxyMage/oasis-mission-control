// day-night.ts — Ciclo día/noche para el OASIS Mission Control
// La hora se obtiene con new Date() en el timezone local del navegador.
// El usuario debe tener su sistema en Europe/Madrid (o el horario coincidirá con su TZ).

export type DayPhase = 'night' | 'dawn' | 'morning' | 'day' | 'sunset' | 'dusk';

export interface TimeOfDay {
  phase: DayPhase;
  overlayColor: string; // rgba(...)
  brightness: number;   // 0.0 – 1.0
  label: string;
}

// ─── Phase definitions ──────────────────────────────────────────────────────

interface PhaseConfig {
  phase: DayPhase;
  label: string;
  /** Start hour (inclusive) */
  startHour: number;
  overlayRGBA: [number, number, number, number]; // r, g, b, a (0-1)
  brightness: number;
  /** Text color for the clock indicator */
  textColor: string;
}

export const PHASE_COLORS: Record<DayPhase, string> = {
  night:   '#6688cc',
  dawn:    '#cc8844',
  morning: '#ffcc66',
  day:     '#ffffff',
  sunset:  '#cc6644',
  dusk:    '#8866aa',
};

// Ordered by start hour; wraps around midnight via logic below.
const PHASES: PhaseConfig[] = [
  { phase: 'night',   label: 'Noche',      startHour:  0, overlayRGBA: [10,  10,  40,  0.45], brightness: 0.60, textColor: '#6688cc' },
  { phase: 'dawn',    label: 'Amanecer',   startHour:  5, overlayRGBA: [80,  50,  30,  0.25], brightness: 0.75, textColor: '#cc8844' },
  { phase: 'morning', label: 'Mañana',     startHour:  7, overlayRGBA: [255, 200, 100, 0.08], brightness: 0.95, textColor: '#ffcc66' },
  { phase: 'day',     label: 'Día',        startHour: 10, overlayRGBA: [0,   0,   0,   0.00], brightness: 1.00, textColor: '#ffffff' },
  { phase: 'sunset',  label: 'Atardecer',  startHour: 17, overlayRGBA: [120, 40,  20,  0.20], brightness: 0.85, textColor: '#cc6644' },
  { phase: 'dusk',    label: 'Anochecer',  startHour: 20, overlayRGBA: [30,  20,  60,  0.30], brightness: 0.70, textColor: '#8866aa' },
  // Virtual sentinel that is "night again" at 23:00 — same as index 0 values
  { phase: 'night',   label: 'Noche',      startHour: 23, overlayRGBA: [10,  10,  40,  0.45], brightness: 0.60, textColor: '#6688cc' },
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRGBA(
  a: [number, number, number, number],
  b: [number, number, number, number],
  t: number,
): [number, number, number, number] {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
    lerp(a[3], b[3], t),
  ];
}

function toRGBAString([r, g, b, a]: [number, number, number, number]): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a.toFixed(3)})`;
}

/**
 * Returns TimeOfDay for the given hour (0-23) and minute (0-59),
 * interpolating smoothly across phase boundaries.
 */
export function getTimeOfDay(hour: number, minute: number): TimeOfDay {
  const totalMinutes = hour * 60 + minute;

  // Find which phase we're in (and next phase for interpolation)
  // PHASES[0..5] are the real phases; PHASES[6] is the sentinel.
  let currentIdx = 0;
  for (let i = 0; i < PHASES.length - 1; i++) {
    if (totalMinutes >= PHASES[i].startHour * 60) {
      currentIdx = i;
    }
  }

  const current = PHASES[currentIdx];
  const next = PHASES[currentIdx + 1] ?? PHASES[0];

  const phaseStartMin = current.startHour * 60;
  const phaseEndMin = next.startHour * 60;
  const phaseDuration = phaseEndMin - phaseStartMin; // always > 0 given our table

  // t goes from 0 at start of this phase to 1 at the boundary with next
  const t = phaseDuration > 0 ? (totalMinutes - phaseStartMin) / phaseDuration : 0;

  const rgba = lerpRGBA(current.overlayRGBA, next.overlayRGBA, t);
  const brightness = lerp(current.brightness, next.brightness, t);

  return {
    phase: current.phase,
    overlayColor: toRGBAString(rgba),
    brightness,
    label: current.label,
  };
}

/**
 * Convenience wrapper: reads the current local time from `date` (default: now)
 * and returns the overlay parameters ready to use in the canvas.
 */
export function getDayNightOverlay(date?: Date): {
  color: string;
  brightness: number;
  phase: DayPhase;
  label: string;
  textColor: string;
} {
  const d = date ?? new Date();
  const hour = d.getHours();
  const minute = d.getMinutes();
  const tod = getTimeOfDay(hour, minute);
  return {
    color: tod.overlayColor,
    brightness: tod.brightness,
    phase: tod.phase,
    label: tod.label,
    textColor: PHASE_COLORS[tod.phase],
  };
}
