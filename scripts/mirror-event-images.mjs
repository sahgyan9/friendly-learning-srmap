// scripts/mirror-event-images.mjs
// Downloads event featured images & poster images for active university events,
// optimizes to WebP (~30-60KB), uploads to `event-images` Supabase bucket,
// and updates srmap_events_cache.

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = "https://ruapdkrgcbqrhvsayvpf.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1YXBka3JnY2Jxcmh2c2F5dnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA4ODU5NzMsImV4cCI6MjA1NjQ2MTk3M30.V5jQfO-__C1gSbX33c2M-iBouFVWbO1bSPnRlc9iw1s";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BUCKET = "event-images";

async function optimizeAndUpload(url, filename, maxWidth = 800) {
  if (!url || typeof url !== "string" || !url.startsWith("http")) return null;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const arrayBuffer = await res.arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const optimized = await sharp(inputBuffer)
      .resize({
        width: maxWidth,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(filename, optimized, {
        contentType: "image/webp",
        upsert: true,
        cacheControl: "604800", // 7 days cache
      });

    if (error) {
      console.error(`Upload error for ${filename}:`, error.message);
      return null;
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${filename}`;
    console.log(`[EVENT IMG] Uploaded ${filename} (${Math.round(inputBuffer.length / 1024)}KB -> ${Math.round(optimized.length / 1024)}KB)`);
    return publicUrl;
  } catch (err) {
    console.error(`Failed to process event image ${url}:`, err.message);
    return null;
  }
}

async function main() {
  console.log(`\n=== Mirroring Event Images to Supabase Storage ===`);
  const { data: events, error } = await supabase
    .from("srmap_events_cache")
    .select("id, title, image_url, content, start_date, end_date")
    .order("id", { ascending: false });

  if (error) throw error;
  console.log(`Found ${events?.length ?? 0} events in cache.\n`);

  for (const ev of events || []) {
    let updatedImageUrl = ev.image_url;
    let updatedContent = ev.content;
    let modified = false;

    // 1. Featured image
    if (ev.image_url && ev.image_url.includes("events.srmap.edu.in")) {
      const publicUrl = await optimizeAndUpload(
        ev.image_url,
        `event_${ev.id}_thumb.webp`,
        640,
      );
      if (publicUrl) {
        updatedImageUrl = publicUrl;
        modified = true;
      }
    }

    // 2. Poster image in content HTML
    if (ev.content) {
      const imgMatch = ev.content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
      if (imgMatch && imgMatch[1] && imgMatch[1].includes("events.srmap.edu.in")) {
        const posterUrl = imgMatch[1];
        const publicPosterUrl = await optimizeAndUpload(
          posterUrl,
          `event_${ev.id}_poster.webp`,
          1000,
        );
        if (publicPosterUrl) {
          updatedContent = updatedContent.replace(posterUrl, publicPosterUrl);
          modified = true;
        }
      }
    }

    if (modified) {
      const { error: updateErr } = await supabase
        .from("srmap_events_cache")
        .update({
          image_url: updatedImageUrl,
          content: updatedContent,
        })
        .eq("id", ev.id);

      if (updateErr) {
        console.error(`Failed to update DB for event ${ev.id}:`, updateErr.message);
      } else {
        console.log(`Updated DB cache for event ${ev.id}: ${ev.title}`);
      }
    }
  }

  console.log(`\nEvent images mirroring complete!`);
}

main().catch(console.error);
