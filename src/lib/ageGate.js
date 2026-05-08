export const AGE_GATE_KEY = "girl-mode-age-confirmation";

function getStorage() {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage;
  } catch {
    return null;
  }
}

export function hasAgeConfirmation() {
  try {
    return getStorage()?.getItem(AGE_GATE_KEY) === "confirmed";
  } catch {
    return false;
  }
}

export function saveAgeConfirmation() {
  try {
    getStorage()?.setItem(AGE_GATE_KEY, "confirmed");
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}

export function clearAgeConfirmation() {
  try {
    getStorage()?.removeItem(AGE_GATE_KEY);
  } catch {
    // Storage may be unavailable in private or restricted browser contexts.
  }
}
