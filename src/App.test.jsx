import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.jsx";
import { AGE_GATE_KEY } from "./lib/ageGate.js";

const sampleData = {
  site: {
    title: "Girl Mode",
    notice: "Test notice."
  },
  images: [
    {
      id: "tokyo",
      src: "/images/tokyo.svg",
      title: "Tokyo Night",
      location: "Tokyo",
      photographer: "Studio A",
      date: "2026-04-01",
      tags: ["street", "night", "members"],
      visibility: "members",
      description: "Neon set"
    },
    {
      id: "seoul",
      src: "/images/seoul.svg",
      title: "Seoul Studio",
      location: "Seoul",
      photographer: "Studio B",
      date: "2026-03-01",
      tags: ["studio"],
      description: "Studio set"
    }
  ]
};

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
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      const requestUrl = typeof url === "string" ? url : url?.url;

      if (requestUrl === "/api/auth/me") {
        return {
          ok: true,
          json: async () => ({ user: null })
        };
      }

      if (requestUrl === "/api/setup/status") {
        return {
          ok: true,
          json: async () => ({ needsFirstAdmin: false })
        };
      }

      if (requestUrl === "/api/gallery-access") {
        return {
          ok: true,
          json: async () => ({ authenticated: false, role: null, restrictedTags: ["members"] })
        };
      }

      return {
        ok: true,
        json: async () => sampleData
      };
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("App", () => {
  it("requires age confirmation before showing the gallery", async () => {
    const user = userEvent.setup();

    render(<App />);
    expect(screen.getByText(/Neo Pop Lookbook/i)).toBeInTheDocument();
    expect(await screen.findByText("Test notice.")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /Gallery images/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Tokyo Night/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Tokyo Night")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /I Confirm/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem(AGE_GATE_KEY)).toBe("confirmed");
      expect(screen.getByRole("heading", { name: "Girl Mode" })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: /Gallery images/i })).toBeInTheDocument();
    });
  });

  it("filters images by search query", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(AGE_GATE_KEY, "confirmed");

    render(<App />);

    expect(await screen.findByText("Tokyo Night")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/search looks, tags, styles/i), "Seoul");

    expect(screen.getAllByText("Seoul Studio")).toHaveLength(2);
    expect(screen.queryByText("Tokyo Night")).not.toBeInTheDocument();
  });

  it("opens the lightbox when a gallery image is clicked", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(AGE_GATE_KEY, "confirmed");

    render(<App />);

    const gallery = await screen.findByRole("region", { name: /Gallery images/i });
    const tile = within(gallery).getByRole("button", { name: /Seoul Studio/i });
    await user.click(tile);

    expect(screen.getByRole("dialog", { name: "Seoul Studio" })).toBeInTheDocument();
  });

  it("blurs restricted images for visitors and routes access attempts to login", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(AGE_GATE_KEY, "confirmed");

    render(<App />);

    const gallery = await screen.findByRole("region", { name: /Gallery images/i });
    const loginToView = within(gallery).getByRole("button", {
      name: /Login to view Tokyo Night/i
    });

    await user.click(loginToView);

    expect(screen.getByRole("dialog", { name: /Login/i })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Tokyo Night" })).not.toBeInTheDocument();
  });

  it("opens the request access form from visitor auth controls", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(AGE_GATE_KEY, "confirmed");

    render(<App />);

    const authControls = await screen.findByRole("region", { name: /Account controls/i });
    await user.click(within(authControls).getByRole("button", { name: /Request Access/i }));

    expect(screen.getByRole("dialog", { name: /Request Access/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact/i)).toBeInTheDocument();
  });

  it("opens the login form from visitor auth controls", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(AGE_GATE_KEY, "confirmed");

    render(<App />);

    const authControls = await screen.findByRole("region", { name: /Account controls/i });
    await user.click(within(authControls).getByRole("button", { name: /^Login$/i }));

    expect(screen.getByRole("dialog", { name: /Login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });
});
