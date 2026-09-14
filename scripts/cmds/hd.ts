// @ts-nocheck
"use strict";

import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

// ─── Image enhancement ──────────────────────────────────────────────────────
// Pipeline: nlmeans denoise → 2x lanczos upscale → aggressive unsharp → contrast boost
// We use ffmpeg instead of sharp so we can chain proper denoising before upscale
async function enhanceImage(inputBuffer: Buffer): Promise<{ buffer: Buffer; mime: string }> {
  const timestamp = Date.now();
  const inputPath = path.join(os.tmpdir(), `cherry_hd_img_in_${timestamp}.jpg`);
  const outputPath = path.join(os.tmpdir(), `cherry_hd_img_out_${timestamp}.jpg`);

  try {
    await fs.promises.writeFile(inputPath, inputBuffer);

    // 1. nlmeans: removes compression artifacts / noise before upscale so they don't get amplified
    // 2. scale 2x with lanczos: high-quality resampling
    // 3. unsharp: strong sharpening to recover edge detail (lx ly la = luma, cx cy ca = chroma)
    // 4. eq: slight contrast + saturation lift for vivid look
    const vf = [
      "nlmeans=s=3:p=7:r=15",
      "scale=iw*2:ih*2:flags=lanczos+accurate_rnd",
      "unsharp=lx=7:ly=7:la=2.5:cx=7:cy=7:ca=0.5",
      "eq=contrast=1.08:brightness=0.02:saturation=1.12:gamma=0.97",
    ].join(",");

    await execFileAsync("ffmpeg", [
      "-y",
      "-i", inputPath,
      "-vf", vf,
      "-q:v", "1",          // highest JPEG quality ffmpeg allows
      "-qmin", "1",
      "-qmax", "2",
      outputPath,
    ]);

    const buffer = await fs.promises.readFile(outputPath);
    return { buffer, mime: "image/jpeg" };
  } finally {
    await fs.promises.unlink(inputPath).catch(() => {});
    await fs.promises.unlink(outputPath).catch(() => {});
  }
}

// ─── Video enhancement ──────────────────────────────────────────────────────
// Pipeline: hqdn3d denoise → 2x lanczos upscale → unsharp sharpen
// H.264 High @ CRF 16 with veryslow preset — maximum encoder effort
async function enhanceVideo(inputBuffer: Buffer): Promise<Buffer> {
  const timestamp = Date.now();
  const inputPath = path.join(os.tmpdir(), `cherry_hd_vid_in_${timestamp}.mp4`);
  const outputPath = path.join(os.tmpdir(), `cherry_hd_vid_out_${timestamp}.mp4`);

  try {
    await fs.promises.writeFile(inputPath, inputBuffer);

    // hqdn3d: temporal + spatial denoising so the upscale is clean
    // scale 2x lanczos: crisp pixel-level upscale
    // unsharp: restore edge definition lost in denoise
    const vf = [
      "hqdn3d=luma_spatial=3:chroma_spatial=3:luma_temporal=6:chroma_temporal=6",
      "scale=iw*2:ih*2:flags=lanczos+accurate_rnd",
      "unsharp=lx=5:ly=5:la=2.0:cx=5:cy=5:ca=0.4",
    ].join(",");

    await execFileAsync("ffmpeg", [
      "-y",
      "-i", inputPath,
      "-vf", vf,
      "-c:v", "libx264",
      "-profile:v", "high",
      "-level", "4.1",
      "-preset", "veryslow",   // maximum compression quality at given CRF
      "-crf", "16",            // near-lossless (0=perfect, 51=worst, 16=great)
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-b:a", "320k",
      "-ar", "48000",
      "-movflags", "+faststart",
      outputPath,
    ]);

    return await fs.promises.readFile(outputPath);
  } finally {
    await fs.promises.unlink(inputPath).catch(() => {});
    await fs.promises.unlink(outputPath).catch(() => {});
  }
}

// ─── GIF/Animated enhancement ───────────────────────────────────────────────
// Same as video pipeline but output as silent mp4 with gifPlayback flag
async function enhanceGif(inputBuffer: Buffer): Promise<Buffer> {
  const timestamp = Date.now();
  const inputPath = path.join(os.tmpdir(), `cherry_hd_gif_in_${timestamp}.gif`);
  const outputPath = path.join(os.tmpdir(), `cherry_hd_gif_out_${timestamp}.mp4`);

  try {
    await fs.promises.writeFile(inputPath, inputBuffer);

    const vf = [
      "hqdn3d=luma_spatial=2:chroma_spatial=2:luma_temporal=4:chroma_temporal=4",
      "scale=iw*2:ih*2:flags=lanczos+accurate_rnd",
      "unsharp=lx=5:ly=5:la=2.0:cx=5:cy=5:ca=0.4",
    ].join(",");

    await execFileAsync("ffmpeg", [
      "-y",
      "-i", inputPath,
      "-vf", vf,
      "-c:v", "libx264",
      "-profile:v", "high",
      "-preset", "veryslow",
      "-crf", "16",
      "-pix_fmt", "yuv420p",
      "-an",
      "-movflags", "+faststart",
      outputPath,
    ]);

    return await fs.promises.readFile(outputPath);
  } finally {
    await fs.promises.unlink(inputPath).catch(() => {});
    await fs.promises.unlink(outputPath).catch(() => {});
  }
}

commandintro({
  name: "hd",
  author: "Yugant Xettri",
  aliases: ["enhance", "upscale", "quality"],
  role: 0,
  onStart: async (sock, msg, { reply, react, remoteJid, quotedMsg }) => {
    let mediaType: "image" | "video" | "gif" | null = null;
    let mediaMessage: any = null;
    let isDirectMedia = false;

    // Check direct message first
    if (msg.message?.imageMessage) {
      mediaType = "image";
      mediaMessage = msg.message.imageMessage;
      isDirectMedia = true;
    } else if (msg.message?.videoMessage) {
      const vm = msg.message.videoMessage;
      mediaType = vm.gifPlayback ? "gif" : "video";
      mediaMessage = vm;
      isDirectMedia = true;
    }

    // Then check quoted message
    if (!mediaMessage && quotedMsg) {
      if (quotedMsg.imageMessage) {
        mediaType = "image";
        mediaMessage = quotedMsg.imageMessage;
      } else if (quotedMsg.videoMessage) {
        const vm = quotedMsg.videoMessage;
        mediaType = vm.gifPlayback ? "gif" : "video";
        mediaMessage = vm;
      } else if (quotedMsg.documentMessage) {
        const mime = quotedMsg.documentMessage.mimetype || "";
        if (mime.startsWith("image/")) {
          mediaType = "image";
          mediaMessage = quotedMsg.documentMessage;
        } else if (mime.startsWith("video/")) {
          mediaType = "video";
          mediaMessage = quotedMsg.documentMessage;
        }
      }
    }

    if (!mediaMessage) {
      await reply(
        "📸 *HD Enhancer*\n\n" +
        "• Send an image with caption `+hd`\n" +
        "• Send a video with caption `+hd`\n" +
        "• Reply to any image or video with `+hd`\n\n" +
        "_Denoises, upscales 2× with lanczos, and sharpens edges for a genuinely cleaner result._"
      );
      return;
    }

    await react("⏳");

    try {
      // Build the correct media source for quoted vs direct
      const msgType = mediaType === "gif" ? "video" : mediaType;
      const mediaSource = isDirectMedia
        ? msg
        : { key: msg.key, message: { [`${msgType}Message`]: mediaMessage } };

      const rawBuffer = await downloadMediaMessage(mediaSource, "buffer", {});

      if (!rawBuffer || rawBuffer.length === 0) {
        await react("❌");
        await reply("❌ Couldn't download the media. Try again.");
        return;
      }

      if (mediaType === "image") {
        const { buffer: hdBuffer, mime } = await enhanceImage(rawBuffer);
        const sizeMB = (hdBuffer.length / 1024 / 1024).toFixed(2);

        await sock.sendMessage(
          remoteJid,
          {
            image: hdBuffer,
            mimetype: mime,
            caption:
              `✨ *HD Enhanced*\n` +
              `📦 ${sizeMB} MB  ·  🔍 2× upscale  ·  nlmeans denoise  ·  unsharp`,
          },
          { quoted: msg }
        );

      } else if (mediaType === "video") {
        await reply("🎬 Enhancing video — this takes a bit, hang tight...");
        const hdBuffer = await enhanceVideo(rawBuffer);
        const sizeMB = (hdBuffer.length / 1024 / 1024).toFixed(2);

        await sock.sendMessage(
          remoteJid,
          {
            video: hdBuffer,
            mimetype: "video/mp4",
            caption:
              `✨ *HD Enhanced*\n` +
              `📦 ${sizeMB} MB  ·  🔍 2× upscale  ·  hqdn3d denoise  ·  CRF 16`,
          },
          { quoted: msg }
        );

      } else if (mediaType === "gif") {
        await reply("🎞️ Enhancing GIF — hang tight...");
        const hdBuffer = await enhanceGif(rawBuffer);

        await sock.sendMessage(
          remoteJid,
          {
            video: hdBuffer,
            mimetype: "video/mp4",
            gifPlayback: true,
            caption: `✨ *HD Enhanced GIF*  ·  🔍 2× upscale  ·  denoised`,
          },
          { quoted: msg }
        );
      }

      await react("✅");
    } catch (err) {
      console.error("[HD] Enhancement error:", err);
      await react("❌");
      await reply("❌ Enhancement failed. Make sure the image or video isn't corrupted.");
    }
  },
});
