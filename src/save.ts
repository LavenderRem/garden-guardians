export interface Save { version: 1; unlocked: number; completed: number[]; volume: number }
const defaults = (): Save => ({ version: 1, unlocked: 1, completed: [], volume: 0.45 });
const KEY = 'garden-guardians-v1';
export function decodeSave(raw: string | null): Save {
  try {
    const data = JSON.parse(raw ?? 'null');
    if (!data || data.version !== 1) return defaults();
    return {
      version: 1,
      unlocked: Number.isInteger(data.unlocked) ? Math.min(3, Math.max(1, data.unlocked)) : 1,
      completed: Array.isArray(data.completed) ? [...new Set<number>(data.completed.filter((n: unknown) => Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 3))].sort() : [],
      volume: typeof data.volume === 'number' && Number.isFinite(data.volume) ? Math.min(1, Math.max(0, data.volume)) : 0.45,
    };
  } catch { return defaults(); }
}
export function completeLevel(save: Save, level: number): Save {
  if (!Number.isInteger(level) || level < 1 || level > 3) return save;
  return { ...save, unlocked: Math.max(save.unlocked, Math.min(3, level + 1)), completed: [...new Set([...save.completed, level])].sort() };
}
export function readSave(): Save {
  try { return decodeSave(localStorage.getItem(KEY)); } catch { return defaults(); }
}
export function writeSave(save: Save): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(save)); return true; } catch { return false; }
}
