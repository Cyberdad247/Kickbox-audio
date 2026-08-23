'use client';

import type React from 'react';
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';

export type AvatarTab = 'chat' | 'live' | 'media' | 'transcribe';

export interface AvatarSettings {
  useSearch: boolean;
  useMaps: boolean;
  highThinking: boolean;
  lowLatency: boolean;
}

export interface AvatarConfigContextValue {
  isConfigOpen: boolean;
  activeTab: AvatarTab;
  settings: AvatarSettings;
  openConfig: (tab?: AvatarTab) => void;
  closeConfig: () => void;
  toggleConfig: () => void;
  setActiveTab: (tab: AvatarTab) => void;
  updateSetting: <K extends keyof AvatarSettings>(key: K, value: AvatarSettings[K]) => void;
  setSettings: React.Dispatch<React.SetStateAction<AvatarSettings>>;
}

const STORAGE_KEY = 'sovereign_avatar_config_v1';

const defaultSettings: AvatarSettings = {
  useSearch: false,
  useMaps: false,
  highThinking: false,
  lowLatency: false,
};

const AvatarConfigContext = createContext<AvatarConfigContextValue | undefined>(undefined);

export function AvatarConfigProvider({ children }: { children: ReactNode }) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<AvatarTab>('chat');
  const [settings, setSettingsState] = useState<AvatarSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);

  // Restore configuration settings and active tab from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.activeTab) {
          setActiveTabState(parsed.activeTab);
        }
        if (parsed.settings && typeof parsed.settings === 'object') {
          setSettingsState((prev) => ({
            ...prev,
            ...parsed.settings,
          }));
        }
      }
    } catch (err) {
      console.warn('Failed to load avatar configuration from localStorage', err);
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist to localStorage whenever settings or active tab change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activeTab,
          settings,
        }),
      );
    } catch (err) {
      console.warn('Failed to persist avatar configuration to localStorage', err);
    }
  }, [activeTab, settings, hydrated]);

  const setActiveTab = (tab: AvatarTab) => {
    setActiveTabState(tab);
  };

  const updateSetting = <K extends keyof AvatarSettings>(key: K, value: AvatarSettings[K]) => {
    setSettingsState((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const openConfig = (tab?: AvatarTab) => {
    if (tab) setActiveTabState(tab);
    setIsConfigOpen(true);
  };

  const closeConfig = () => setIsConfigOpen(false);
  const toggleConfig = () => setIsConfigOpen((prev) => !prev);

  return (
    <AvatarConfigContext.Provider
      value={{
        isConfigOpen,
        activeTab,
        settings,
        openConfig,
        closeConfig,
        toggleConfig,
        setActiveTab,
        updateSetting,
        setSettings: setSettingsState,
      }}
    >
      {children}
    </AvatarConfigContext.Provider>
  );
}

export function useAvatarConfig() {
  const context = useContext(AvatarConfigContext);
  if (!context) {
    throw new Error('useAvatarConfig must be used within an AvatarConfigProvider');
  }
  return context;
}
