import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Difficulty } from '../engine/types';

interface SettingsState {
  difficulty: Difficulty;
  openAiApiKey: string;
  coachEnabled: boolean;
  soundEnabled: boolean;
  setDifficulty: (d: Difficulty) => void;
  setApiKey: (key: string) => void;
  setCoachEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    set => ({
      difficulty: 'medium',
      openAiApiKey: '',
      coachEnabled: true,
      soundEnabled: false,
      setDifficulty: d => set({ difficulty: d }),
      setApiKey: key => set({ openAiApiKey: key }),
      setCoachEnabled: enabled => set({ coachEnabled: enabled }),
      setSoundEnabled: enabled => set({ soundEnabled: enabled }),
    }),
    { name: 'bomb-busters-settings' }
  )
);
