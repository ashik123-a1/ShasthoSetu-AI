import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) ?? null) : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const memoryStorage = new MemoryStorage();
Object.defineProperty(window, "localStorage", { value: memoryStorage, writable: true });
Object.defineProperty(globalThis, "localStorage", { value: memoryStorage, writable: true });

const memorySessionStorage = new MemoryStorage();
memorySessionStorage.setItem("ss-preloader-seen-v1", "1");
Object.defineProperty(window, "sessionStorage", { value: memorySessionStorage, writable: true });
Object.defineProperty(globalThis, "sessionStorage", { value: memorySessionStorage, writable: true });

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.setItem("ss-preloader-seen-v1", "1");
  document.documentElement.lang = "bn";
  document.documentElement.dataset.theme = "light";
  document.documentElement.classList.remove("reduce-motion");
});

if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (!window.requestAnimationFrame) {
  window.requestAnimationFrame = (cb: FrameRequestCallback) =>
    window.setTimeout(() => cb(performance.now()), 0);
}
window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
