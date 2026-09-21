import { mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GALLERY_PHOTOS, getGallerySources } from "../src/invitation.js";

// The CommonJS entry point also supports the project's Node 20.9 runtime.
const sharp = createRequire(import.meta.url)("sharp");
const projectRoot = new URL("../", import.meta.url);
const totals = { original: 0, thumbnail: 0, full: 0, firstPageOriginal: 0, firstPageThumbnail: 0 };

for (const [index, original] of GALLERY_PHOTOS.entries()) {
  const source = fileURLToPath(new URL(original, projectRoot));
  const originalBytes = (await stat(source)).size;
  const paths = getGallerySources(index + 1);
  totals.original += originalBytes;
  if (index < 6) totals.firstPageOriginal += originalBytes;

  for (const [variant, edge, quality] of [["thumbnail", 480, 78], ["full", 1800, 85]]) {
    const destination = fileURLToPath(new URL(paths[variant], projectRoot));
    await mkdir(dirname(destination), { recursive: true });
    const result = await sharp(source)
      .rotate()
      .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 4 })
      .toFile(destination);
    totals[variant] += result.size;
    if (index < 6 && variant === "thumbnail") totals.firstPageThumbnail += result.size;
  }
  console.log(`Optimized ${index + 1}/${GALLERY_PHOTOS.length}: ${original.split("/").pop()}`);
}

console.log(JSON.stringify({ photos: GALLERY_PHOTOS.length, bytes: totals }, null, 2));
