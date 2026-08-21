// Real-time Data Synchronization Manager across all modules and browser tabs
type SyncCallback = () => void;
const syncListeners = new Set<SyncCallback>();

let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('tradeuz_erp_sync');
    channel.onmessage = () => {
      notifyLocalListeners();
    };
  }
} catch {
  // Fallback for isolated iframe environments
}

function notifyLocalListeners() {
  syncListeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('Error in sync listener:', e);
    }
  });
}

export function notifySyncEvent() {
  notifyLocalListeners();
  if (channel) {
    try {
      channel.postMessage({ type: 'SYNC_UPDATE', timestamp: Date.now() });
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('tradeuz_erp_sync_event'));
    } catch {
      // ignore
    }
  }
}

export function subscribeAppDataSync(callback: SyncCallback): () => void {
  syncListeners.add(callback);

  const handleWindowCustomEvent = () => {
    callback();
  };

  if (typeof window !== 'undefined') {
    try {
      window.addEventListener('tradeuz_erp_sync_event', handleWindowCustomEvent);
    } catch {
      // ignore
    }
  }

  return () => {
    syncListeners.delete(callback);
    if (typeof window !== 'undefined') {
      try {
        window.removeEventListener('tradeuz_erp_sync_event', handleWindowCustomEvent);
      } catch {
        // ignore
      }
    }
  };
}
