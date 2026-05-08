import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AGE_GATE_KEY,
  clearAgeConfirmation,
  hasAgeConfirmation,
  saveAgeConfirmation
} from "./ageGate.js";

describe("age gate storage", () => {
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalLocalStorageDescriptor = Object.getOwnPropertyDescriptor(
    window,
    "localStorage"
  );

  function installMemoryStorage() {
    const store = new Map();
    const memoryStorage = {
      clear: vi.fn(() => store.clear()),
      getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
      removeItem: vi.fn((key) => store.delete(key)),
      setItem: vi.fn((key, value) => store.set(key, String(value)))
    };

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: memoryStorage
    });

    return memoryStorage;
  }

  beforeEach(() => {
    installMemoryStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();

    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    } else {
      delete globalThis.window;
    }

    if (originalLocalStorageDescriptor) {
      Object.defineProperty(window, "localStorage", originalLocalStorageDescriptor);
    }

    if (typeof window !== "undefined") {
      installMemoryStorage();
    }
  });

  it("starts unconfirmed", () => {
    expect(hasAgeConfirmation()).toBe(false);
  });

  it("saves confirmation", () => {
    saveAgeConfirmation();
    expect(window.localStorage.getItem(AGE_GATE_KEY)).toBe("confirmed");
    expect(hasAgeConfirmation()).toBe(true);
  });

  it("clears confirmation", () => {
    saveAgeConfirmation();
    clearAgeConfirmation();
    expect(hasAgeConfirmation()).toBe(false);
  });

  it("no-ops when window is absent", () => {
    delete globalThis.window;

    expect(hasAgeConfirmation()).toBe(false);
    expect(() => saveAgeConfirmation()).not.toThrow();
    expect(() => clearAgeConfirmation()).not.toThrow();
  });

  it("no-ops when localStorage getter throws", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("localStorage blocked");
      }
    });

    expect(hasAgeConfirmation()).toBe(false);
    expect(() => saveAgeConfirmation()).not.toThrow();
    expect(() => clearAgeConfirmation()).not.toThrow();
  });

  it("returns false when getItem throws", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem() {
          throw new Error("getItem blocked");
        }
      }
    });

    expect(hasAgeConfirmation()).toBe(false);
  });

  it("does not throw when setItem throws", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        setItem() {
          throw new Error("setItem blocked");
        }
      }
    });

    expect(() => saveAgeConfirmation()).not.toThrow();
  });

  it("does not throw when removeItem throws", () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        removeItem() {
          throw new Error("removeItem blocked");
        }
      }
    });

    expect(() => clearAgeConfirmation()).not.toThrow();
  });
});
