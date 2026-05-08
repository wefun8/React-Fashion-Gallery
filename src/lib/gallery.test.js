import { describe, expect, it } from "vitest";
import {
  canViewImage,
  collectTags,
  filterImages,
  isRestrictedImage,
  normalizeGalleryData,
  sortImages
} from "./gallery.js";

const images = [
  {
    id: "tokyo-night",
    src: "/images/tokyo-night.svg",
    title: "Tokyo Night",
    location: "Tokyo",
    photographer: "Studio A",
    date: "2026-04-12",
    tags: ["street", "night"],
    description: "Neon portrait set"
  },
  {
    id: "seoul-studio",
    src: "/images/seoul-studio.svg",
    title: "Seoul Studio",
    location: "Seoul",
    photographer: "Studio B",
    date: "2026-02-02",
    tags: ["studio", "lookbook"],
    description: "Clean studio light"
  }
];

describe("normalizeGalleryData", () => {
  it("keeps valid images and fills optional text fields", () => {
    const data = normalizeGalleryData({
      site: { title: "Girl Mode" },
      images: [{ id: "a", src: "/a.svg", title: "A", tags: ["street"] }]
    });

    expect(data.site.title).toBe("Girl Mode");
    expect(data.site.notice).toBe("Content is configured by the site owner.");
    expect(data.images[0]).toMatchObject({
      id: "a",
      src: "/a.svg",
      title: "A",
      location: "",
      photographer: "",
      description: ""
    });
  });

  it("removes images missing required fields", () => {
    const data = normalizeGalleryData({
      images: [
        { id: "valid", src: "/valid.svg", title: "Valid", tags: [" Street ", "NIGHT"] },
        { id: "", src: "/bad.svg", title: "Bad", tags: ["x"] },
        { id: "bad-2", src: "", title: "Bad", tags: ["x"] },
        { id: "bad-title", src: "/bad.svg", title: "", tags: ["x"] },
        { id: "missing-title", src: "/bad.svg", tags: ["x"] },
        { id: "bad-tags", src: "/bad.svg", title: "Bad", tags: [] },
        { id: "bad-blank-tags", src: "/bad.svg", title: "Bad", tags: ["  "] }
      ]
    });

    expect(data.images).toHaveLength(1);
    expect(data.images[0].id).toBe("valid");
    expect(data.images[0].tags).toEqual(["street", "night"]);
  });

  it("drops non-object image entries without throwing", () => {
    const data = normalizeGalleryData({
      images: [
        null,
        "bad",
        42,
        { id: "valid", src: "/valid.svg", title: "Valid", tags: ["x"] }
      ]
    });

    expect(data.images).toHaveLength(1);
    expect(data.images[0].id).toBe("valid");
  });

  it("normalizes restricted tags and image visibility", () => {
    const data = normalizeGalleryData({
      site: { restrictedTags: [" Members ", "PRIVATE", "", 42] },
      images: [
        {
          id: "members-only",
          src: "/members.svg",
          title: "Members Only",
          tags: ["Street"],
          visibility: "members"
        },
        {
          id: "bad-visibility",
          src: "/public.svg",
          title: "Public",
          tags: ["Studio"],
          visibility: "secret"
        }
      ]
    });

    expect(data.site.restrictedTags).toEqual(["members", "private"]);
    expect(data.images.map((image) => image.visibility)).toEqual([
      "members",
      "public"
    ]);
  });
});

describe("gallery access rules", () => {
  it("detects images restricted by members visibility", () => {
    expect(isRestrictedImage({ visibility: "members", tags: ["street"] })).toBe(true);
  });

  it("detects images restricted by configured tags", () => {
    expect(
      isRestrictedImage({ visibility: "public", tags: ["Lookbook", "Members"] }, [
        "members",
        "private"
      ])
    ).toBe(true);
  });

  it("allows visitors to view only unrestricted images and users to view restricted images", () => {
    const restrictedImage = { visibility: "public", tags: ["private"] };
    const publicImage = { visibility: "public", tags: ["street"] };

    expect(canViewImage(restrictedImage, ["private"], null)).toBe(false);
    expect(canViewImage(publicImage, ["private"], null)).toBe(true);
    expect(canViewImage(restrictedImage, ["private"], { id: "user-1" })).toBe(true);
  });
});

describe("collectTags", () => {
  it("returns sorted unique tags", () => {
    expect(collectTags(images)).toEqual(["lookbook", "night", "street", "studio"]);
  });
});

describe("filterImages", () => {
  it("matches query across title, location, photographer, tags, and description", () => {
    expect(filterImages(images, { query: "neon", tag: "all" })).toHaveLength(1);
    expect(filterImages(images, { query: "studio b", tag: "all" })).toHaveLength(1);
    expect(filterImages(images, { query: "lookbook", tag: "all" })).toHaveLength(1);
  });

  it("filters by selected tag", () => {
    const result = filterImages(images, { query: "", tag: "street" });
    expect(result.map((image) => image.id)).toEqual(["tokyo-night"]);
  });
});

describe("sortImages", () => {
  it("sorts latest first", () => {
    expect(sortImages(images, "latest").map((image) => image.id)).toEqual([
      "tokyo-night",
      "seoul-studio"
    ]);
  });

  it("sorts by title and location", () => {
    expect(sortImages(images, "title").map((image) => image.id)).toEqual([
      "seoul-studio",
      "tokyo-night"
    ]);
    expect(sortImages(images, "location").map((image) => image.id)).toEqual([
      "seoul-studio",
      "tokyo-night"
    ]);
  });

  it("does not mutate the original images order", () => {
    const originalOrder = images.map((image) => image.id);
    const sorted = sortImages(images, "title");

    expect(sorted.map((image) => image.id)).toEqual([
      "seoul-studio",
      "tokyo-night"
    ]);
    expect(images.map((image) => image.id)).toEqual(originalOrder);
  });
});
