export interface StoreSettings {
  storeName: string;
  storeBadge: string;
  adminPin: string;
  agentPin: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: 'OSIYO SUPERMARKET',
  storeBadge: 'GO',
  adminPin: '7230',
  agentPin: '1234',
};

export function getStoreSettings(): StoreSettings {
  try {
    const saved = localStorage.getItem('app_store_settings');
    if (saved) {
      return { ...DEFAULT_STORE_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load store settings', e);
  }
  return DEFAULT_STORE_SETTINGS;
}

type SettingsChangeListener = () => void;
const listeners: SettingsChangeListener[] = [];

export function subscribeStoreSettings(listener: SettingsChangeListener) {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}

export function saveStoreSettings(settings: Partial<StoreSettings>): StoreSettings {
  const current = getStoreSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem('app_store_settings', JSON.stringify(updated));

  // Notify memory listeners
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error('Error in store settings listener:', err);
    }
  });

  // Safe DOM Event dispatch without constructor invocation
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    try {
      const evt = document.createEvent('Event');
      evt.initEvent('store_settings_updated', true, true);
      window.dispatchEvent(evt);
    } catch {
      // Ignore if iframe/sandbox blocks dispatchEvent
    }
  }

  return updated;
}
