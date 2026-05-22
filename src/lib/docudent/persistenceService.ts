import type { DocuDentFormState } from "@/lib/docudent/schema";

const STORAGE_KEYS = {
  DRAFT: "docudent_draft_state",
  STASHED: "docudent_stashed_reports",
};

export interface StashedReport {
  id: string;
  timestamp: string;
  state: DocuDentFormState;
  error?: string;
  hasAttachments?: boolean;
}

const DB_NAME = "docudent_binary_cache";
const DB_VERSION = 1;
const STORE_NAME = "attachments";

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const PersistenceService = {
  saveDraft(state: DocuDentFormState): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(state));
  },

  loadDraft(): DocuDentFormState | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEYS.DRAFT);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as DocuDentFormState;
    } catch {
      return null;
    }
  },

  clearDraft(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.DRAFT);
  },

  async stashReport(reportId: string, state: DocuDentFormState, error?: string, files?: File[]): Promise<void> {
    if (typeof window === "undefined") return;
    
    let hasAttachments = false;
    if (files && files.length > 0) {
        try {
          const db = await openDB();
          const tx = db.transaction(STORE_NAME, "readwrite");
          const store = tx.objectStore(STORE_NAME);
          store.put(files, reportId);
          hasAttachments = true;
          await new Promise((resolve, reject) => {
            tx.oncomplete = resolve;
            tx.onerror = reject;
          });
        } catch (e) {
          console.error("Failed to stash binary data in IndexedDB", e);
        }
    }

    const stashed = this.listStashed();
    const entry: StashedReport = {
      id: reportId,
      timestamp: new Date().toISOString(),
      state,
      error,
      hasAttachments,
    };
    localStorage.setItem(STORAGE_KEYS.STASHED, JSON.stringify([...stashed, entry]));
  },

  listStashed(): StashedReport[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEYS.STASHED);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as StashedReport[];
    } catch {
      return [];
    }
  },

  async getStashedAttachments(reportId: string): Promise<File[] | null> {
      if (typeof window === "undefined") return null;
      try {
          const db = await openDB();
          const tx = db.transaction(STORE_NAME, "readonly");
          const store = tx.objectStore(STORE_NAME);
          const request = store.get(reportId);
          return new Promise((resolve, reject) => {
              request.onsuccess = () => resolve(request.result || null);
              request.onerror = () => reject(request.error);
          });
      } catch (e) {
          console.error("Failed to retrieve binary data from IndexedDB", e);
          return null;
      }
  },

  async removeFromStash(reportId: string): Promise<void> {
    if (typeof window === "undefined") return;
    
    // Clear from IndexedDB if present
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(reportId);
    } catch (e) {
        console.warn("Failed to delete binary data from IndexedDB", e);
    }

    const stashed = this.listStashed();
    const filtered = stashed.filter((r) => r.id !== reportId);
    localStorage.setItem(STORAGE_KEYS.STASHED, JSON.stringify(filtered));
  },
};
