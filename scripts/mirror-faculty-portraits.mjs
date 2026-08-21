// scripts/mirror-faculty-portraits.mjs
// Downloads faculty images from SRM AP WordPress server, resizes and optimizes
// them to WebP (360x450 max, ~15-25KB), uploads to Supabase Storage bucket
// `faculty-portraits`, and updates public.faculty.image_url in the database.

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import fs from "fs";

const SUPABASE_URL = "https://ruapdkrgcbqrhvsayvpf.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YXBka3JnY2Jxcmh2c2F5dnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4ODU5NzMsImV4cCI6MjA1NjQ2MTk3M30.V5jQfO-__C1gSbX33c2M-iBouFVWbO1bSPnRlc9iw1s";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BUCKET = "faculty-portraits";
const CONCURRENCY = 8;
const DRY_RUN = process.argv.includes("--dry-run");
const LIMIT = process.argv.find((arg) => arg.startsWith("--limit="))
  ? parseInt(process.argv.find((arg) => arg.startsWith("--limit=")).split("=")[1], 10)
  : null;

async function fetchFacultyToMirror() {
  let query = supabase
    .from("faculty")
    .select("id, slug, name, image_url, department")
    .not("image_url", "is", null)
    .ilike("image_url", "%srmap.edu.in%")
    .order("name", { ascending: true });

  if (LIMIT) {
    query = query.limit(LIMIT);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function downloadAndOptimizeImage(imageUrl) {
  const res = await fetch(imageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${imageUrl}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const inputBuffer = Buffer.from(arrayBuffer);

  // Resize to max 360x450, convert to WebP with good quality
  const optimizedBuffer = await sharp(inputBuffer)
    .resize({
      width: 360,
      height: 450,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  return {
    buffer: optimizedBuffer,
    originalSize: inputBuffer.length,
    optimizedSize: optimizedBuffer.length,
  };
}

async function uploadToStorage(slug, buffer) {
  const filePath = `${slug}.webp`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "31536000", // 1 year cache
    });

  if (error) throw error;

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filePath}`;
  return publicUrl;
}

async function processFaculty(faculty) {
  try {
    const { buffer, originalSize, optimizedSize } = await downloadAndOptimizeImage(faculty.image_url);
    
    if (DRY_RUN) {
      return {
        id: faculty.id,
        slug: faculty.slug,
        name: faculty.name,
        originalSize,
        optimizedSize,
        publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${faculty.slug}.webp`,
        success: true,
      };
    }

    const publicUrl = await uploadToStorage(faculty.slug, buffer);
    return {
      id: faculty.id,
      slug: faculty.slug,
      name: faculty.name,
      originalSize,
      optimizedSize,
      publicUrl,
      success: true,
    };
  } catch (err) {
    return {
      id: faculty.id,
      slug: faculty.slug,
      name: faculty.name,
      error: err.message,
      success: false,
    };
  }
}

async function runInPool(items, concurrency, fn, onProgress) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      const result = await fn(item);
      results[currentIndex] = result;
      if (onProgress) onProgress(result, currentIndex + 1, items.length);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log(`\n=== Mirroring Faculty Portraits to Supabase Storage ===`);
  console.log(`Bucket: ${BUCKET}`);
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no upload)" : "LIVE"}`);

  const facultyList = await fetchFacultyToMirror();
  console.log(`Found ${facultyList.length} faculty profiles with external image URLs.\n`);

  if (facultyList.length === 0) {
    console.log("No faculty images to mirror.");
    return;
  }

  let totalOriginalBytes = 0;
  let totalOptimizedBytes = 0;
  let successCount = 0;
  let failCount = 0;

  const results = await runInPool(
    facultyList,
    CONCURRENCY,
    processFaculty,
    (res, done, total) => {
      if (res.success) {
        successCount++;
        totalOriginalBytes += res.originalSize;
        totalOptimizedBytes += res.optimizedSize;
        const savedPercent = Math.round((1 - res.optimizedSize / res.originalSize) * 100);
        console.log(
          `[${done}/${total}] OK: ${res.name} (${Math.round(res.originalSize / 1024)}KB -> ${Math.round(res.optimizedSize / 1024)}KB, -${savedPercent}%)`,
        );
      } else {
        failCount++;
        console.error(`[${done}/${total}] FAIL: ${res.name} - ${res.error}`);
      }
    },
  );

  console.log(`\n--- Summary ---`);
  console.log(`Total Processed: ${results.length}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Original Total: ${(totalOriginalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Optimized Total: ${(totalOptimizedBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(
    `Total Bandwidth/Storage Saved: ${(
      (1 - totalOptimizedBytes / (totalOriginalBytes || 1)) *
      100
    ).toFixed(1)}%`,
  );

  // Write results to a JSON file for database update migration
  const successfulUpdates = results.filter((r) => r.success);
  fs.writeFileSync(
    "scripts/faculty-image-updates.json",
    JSON.stringify(
      successfulUpdates.map((r) => ({ id: r.id, slug: r.slug, image_url: r.publicUrl })),
      null,
      2,
    ),
  );
  console.log(`Wrote ${successfulUpdates.length} updates to scripts/faculty-image-updates.json`);
}

main().catch(console.error);
