const DEFAULT_SITE = {
  title: "Girl Mode",
  notice: "Content is configured by the site owner.",
  restrictedTags: []
};

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeVisibility(visibility) {
  return text(visibility).toLowerCase() === "members" ? "members" : "public";
}

function normalizeLikes(value, fallbackSeed) {
  if (Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }

  const seed = text(fallbackSeed);
  const total = [...seed].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return 72 + (total % 94);
}

export function normalizeGalleryData(rawData) {
  const site = {
    ...DEFAULT_SITE,
    ...(rawData && typeof rawData.site === "object" ? rawData.site : {})
  };

  const rawImages = Array.isArray(rawData?.images) ? rawData.images : [];

  const images = rawImages
    .filter((image) => image && typeof image === "object")
    .map((image) => ({
      id: text(image.id),
      src: text(image.src),
      title: text(image.title),
      location: text(image.location),
      photographer: text(image.photographer),
      date: text(image.date),
      tags: normalizeTags(image.tags),
      visibility: normalizeVisibility(image.visibility),
      likes: normalizeLikes(image.likes, image.id || image.title),
      description: text(image.description)
    }))
    .filter(
      (image) =>
        image.id &&
        image.src &&
        image.title &&
        Array.isArray(image.tags) &&
        image.tags.length > 0
    );

  return {
    site: {
      title: text(site.title) || DEFAULT_SITE.title,
      notice: text(site.notice) || DEFAULT_SITE.notice,
      restrictedTags: normalizeTags(site.restrictedTags)
    },
    images
  };
}

export function isRestrictedImage(image, restrictedTags = []) {
  if (image?.visibility === "members") {
    return true;
  }

  const normalizedRestrictedTags = normalizeTags(restrictedTags);
  if (normalizedRestrictedTags.length === 0) {
    return false;
  }

  const imageTags = normalizeTags(image?.tags);
  return imageTags.some((tag) => normalizedRestrictedTags.includes(tag));
}

export function canViewImage(image, restrictedTags, user) {
  return Boolean(user) || !isRestrictedImage(image, restrictedTags);
}

export function collectTags(images) {
  return [...new Set(images.flatMap((image) => image.tags))].sort((a, b) =>
    a.localeCompare(b)
  );
}

export function filterImages(images, { query, tag }) {
  const normalizedQuery = text(query).toLowerCase();
  const normalizedTag = tag && tag !== "all" ? tag.toLowerCase() : "all";

  return images.filter((image) => {
    const matchesTag =
      normalizedTag === "all" || image.tags.includes(normalizedTag);

    const searchable = [
      image.title,
      image.location,
      image.photographer,
      image.description,
      image.tags.join(" ")
    ]
      .join(" ")
      .toLowerCase();

    return matchesTag && (!normalizedQuery || searchable.includes(normalizedQuery));
  });
}

export function sortImages(images, sortMode) {
  const sorted = [...images];

  if (sortMode === "title") {
    return sorted.sort((a, b) => a.title.localeCompare(b.title));
  }

  if (sortMode === "location") {
    return sorted.sort((a, b) => a.location.localeCompare(b.location));
  }

  return sorted.sort((a, b) => {
    const dateA = Date.parse(a.date) || 0;
    const dateB = Date.parse(b.date) || 0;
    return dateB - dateA;
  });
}
