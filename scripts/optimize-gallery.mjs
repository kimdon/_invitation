import { mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { basename, dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { getGalleryPhotos, getGallerySources } from "../src/invitation.js";

// The CommonJS entry point also supports the project's Node 20.9 runtime.
const sharp = createRequire(import.meta.url)("sharp");
const run = promisify(execFile);
const projectRoot = new URL("../", import.meta.url);
const { values } = parseArgs({ options: {
  mode: { type: "string", default: "normal" },
  "source-dir": { type: "string" },
} });
if (!["normal", "developer"].includes(values.mode)) throw new Error("mode must be normal or developer");
const photos = getGalleryPhotos(values.mode);
const totals = { original: 0, thumbnail: 0, full: 0, firstPageOriginal: 0, firstPageThumbnail: 0 };

for (const [index, original] of photos.entries()) {
  const source = values["source-dir"] ? join(values["source-dir"], basename(original))
    : fileURLToPath(new URL(original, projectRoot));
  const originalBytes = (await stat(source)).size;
  const paths = getGallerySources(index + 1, values.mode);
  totals.original += originalBytes;
  if (index < 3) totals.firstPageOriginal += originalBytes;

  let temporary;
  try {
    let input = source;
    if (/\.heic$/i.test(source) && process.platform === "darwin") {
      // macOS decodes HEIC even when sharp's bundled libheif has no HEVC decoder.
      temporary = await mkdtemp(join(tmpdir(), "invitation-heic-"));
      input = join(temporary, "decoded.png");
      await run("/usr/bin/sips", ["-s", "format", "png", source, "--out", input]);
    }
    for (const [variant, edge, quality] of [["thumbnail", 480, 78], ["full", 1800, 85]]) {
      const destination = fileURLToPath(new URL(paths[variant], projectRoot));
      await mkdir(dirname(destination), { recursive: true });
      const result = await sharp(input)
        .rotate()
        .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
        .webp({ quality, effort: 4 })
        .toFile(destination);
      totals[variant] += result.size;
      if (index < 3 && variant === "thumbnail") totals.firstPageThumbnail += result.size;
    }
  } finally {
    if (temporary) await rm(temporary, { recursive: true, force: true });
  }
  console.log(`Optimized ${index + 1}/${photos.length}: ${basename(original)}`);
}

console.log(JSON.stringify({ mode: values.mode, photos: photos.length, bytes: totals }, null, 2));
