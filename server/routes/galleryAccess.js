import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesPath = path.resolve(__dirname, "../../public/images.json");

function normalizeTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .filter((tag) => typeof tag === "string")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

function readRestrictedTags() {
  const data = JSON.parse(readFileSync(imagesPath, "utf8"));
  return normalizeTags(data?.site?.restrictedTags);
}

export function createGalleryAccessRouter() {
  const router = Router();

  router.get("/", (request, response) => {
    const user = request.user;
    response.json({
      authenticated: Boolean(user),
      role: user?.role || null,
      restrictedTags: readRestrictedTags()
    });
  });

  return router;
}
