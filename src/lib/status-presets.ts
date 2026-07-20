/**
 * Operator status presets, shared by the admin console (picker) and the
 * public device (NOW strip). Free text rides alongside as a detail line:
 * "⚡ WORKOUT · LEG DAY", "✈ TRAVELLING · EXPLORING ATHENS".
 */
export interface StatusPreset {
  id: string;
  glyph: string;
  label: string;
}

export const STATUS_PRESETS: StatusPreset[] = [
  { id: 'working', glyph: '⚒', label: 'WORKING' },
  { id: 'workout', glyph: '⚡', label: 'WORKOUT' },
  { id: 'eating', glyph: '☕', label: 'EATING' },
  { id: 'travelling', glyph: '✈', label: 'TRAVELLING' },
  { id: 'vacation', glyph: '☼', label: 'VACATION' },
  { id: 'session', glyph: '♪', label: 'AT A SESSION' },
  { id: 'sleeping', glyph: '☾', label: 'SLEEPING' },
  { id: 'offline', glyph: '∅', label: 'OFFLINE' },
];

export const presetById = (id: string): StatusPreset | undefined =>
  STATUS_PRESETS.find((p) => p.id === id);

export interface OperatorStatus {
  preset: string;
  note?: string;
  updated: string; // ISO timestamp
}
