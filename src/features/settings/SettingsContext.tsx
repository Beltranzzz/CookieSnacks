import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { applySettings } from '../../config/runtime';
import { settingsRepo } from '../../data/repositories';
import { DEFAULT_SETTINGS, type Settings } from '../../domain/settings';

interface SettingsCtx { settings: Settings; save: (changes: Partial<Settings>) => Promise<void> }

export const SettingsContext = createContext<SettingsCtx>({ settings: DEFAULT_SETTINGS, save: async () => {} });
export const useSettings = () => useContext(SettingsContext);

// Se llama desde App (y no desde un Provider aparte) para que, al cambiar la configuración,
// se vuelva a pintar toda la app con los nuevos valores.
export function useSettingsState(): SettingsCtx {
  const stored = useLiveQuery(async () => (await settingsRepo.get()) ?? null, []);
  const settings = useMemo<Settings>(() => ({ ...DEFAULT_SETTINGS, ...(stored ?? {}) }), [stored]);
  applySettings(settings);
  const save = useCallback(async (changes: Partial<Settings>) => {
    await settingsRepo.put({ ...settings, ...changes, updatedAt: new Date().toISOString() });
  }, [settings]);
  return { settings, save };
}
