// @ts-nocheck
"use strict";

import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { execFile } from "child_process";
import { promisify } from "util";
import sharp from "sharp";
import axios from "axios";
import fs from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

function isUrl(text) {
  return /^https?:\/\/.+/i.test(text);
}

function addExifToWebp(webpBuffer, pack = "Cherry Bot", author = "Yugant Xettri") {
  try {
    const json = JSON.stringify({
      "sticker-pack-id": "com.cherry.bot",
      "sticker-pack-name": pack,
      "sticker-pack-publisher": author,
      "emojis": ["🍒"],
    });

    const jsonBytes = Buffer.from(json, "utf8");
    const exifHeader = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);
    exifHeader.writeUInt32LE(jsonBytes.length, 14);

    const exifPayload = Buffer.concat([exifHeader, jsonBytes]);

    if (
      webpBuffer.toString("ascii", 0, 4) !== "RIFF" ||
      webpBuffer.toString("ascii", 8, 12) !== "WEBP"
    ) {
      return webpBuffer;
    }

    const exifChunkHeader = Buffer.from("EXIF");
    const exifChunkSize = Buffer.alloc(4);
    exifChunkSize.writeUInt32LE(exifPayload.length, 0);

    const padding = exifPayload.length % 2 !== 0 ? Buffer.from([0x00]) : Buffer.alloc(0);
    const fullExifChunk = Buffer.concat([exifChunkHeader, exifChunkSize, exifPayload, padding]);

    const firstChunkType = webpBuffer.toString("ascii", 12, 16);

    if (firstChunkType === "VP8X") {
      webpBuffer[20] = webpBuffer[20] | 0x08;
      const updatedBuffer = Buffer.concat([webpBuffer, fullExifChunk]);
      updatedBuffer.writeUInt32LE(updatedBuffer.length - 8, 4);
      return updatedBuffer;
    } else {
      const vp8xHeader = Buffer.from([
        0x56, 0x50, 0x38, 0x58, // 'VP8X'
        0x0a, 0x00, 0x00, 0x00, // Size: 10
        0x08, 0x00, 0x00, 0x00, // Flags: EXIF enabled
        0xff, 0x01, 0x00,       // Canvas Width - 1 (511)
        0xff, 0x01, 0x00,       // Canvas Height - 1 (511)
      ]);

      const body = webpBuffer.subarray(12);
      const updated = Buffer.concat([
        webpBuffer.subarray(0, 12),
        vp8xHeader,
        body,
        fullExifChunk,
      ]);
      updated.writeUInt32LE(updated.length - 8, 4);
      return updated;
    }
  } catch {
    return webpBuffer;
  }
}

async function convertImageToSticker(imageBuffer) {
  return await sharp(imageBuffer)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 80 })
    .toBuffer();
}

async function convertVideoToSticker(videoBuffer) {
  const timestamp = Date.now();
  const inputPath = path.join(os.tmpdir(), `cherry_input_${timestamp}.mp4`);
  const outputPath = path.join(os.tmpdir(), `cherry_sticker_${timestamp}.webp`);

  try {
    await fs.promises.writeFile(inputPath, videoBuffer);

    // Convert up to 7 seconds into an animated 512x512 WebP sticker
    await execFileAsync("ffmpeg", [
      "-y",
      "-i", inputPath,
      "-t", "7",
      "-vcodec", "libwebp",
      "-filter:v", "fps=15,scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000",
      "-lossless", "0",
      "-compression_level", "4",
      "-q:v", "60",
      "-loop", "0",
      "-preset", "default",
      "-an",
      outputPath,
    ]);

    const webpBuffer = await fs.promises.readFile(outputPath);
    return webpBuffer;
  } finally {
    await fs.promises.unlink(inputPath).catch(() => {});
    await fs.promises.unlink(outputPath).catch(() => {});
  }
}

commandintro({
  name: "sticker",
  author: "Yugant Xettri",
  aliases: ["s", "stik", "take"],
  role: 0,
  onStart: async (sock, msg, { reply, react, args, remoteJid, quotedMsg }) => {
    let packName = "Cherry Bot";
    let authorName = "Yugant Xettri";

    const customText = args.join(" ").trim();
    if (customText.includes("|")) {
      const parts = customText.split("|");
      packName = parts[0].trim() || packName;
      authorName = parts[1].trim() || authorName;
    } else if (customText && !isUrl(customText)) {
      packName = customText;
    }

    let mediaType = null;
    let mediaMessage = null;
    let isDirectMedia = false;

    // 1. Check direct message
    if (msg.message?.imageMessage) {
      mediaType = "image";
      mediaMessage = msg.message.imageMessage;
      isDirectMedia = true;
    } else if (msg.message?.videoMessage) {
      mediaType = "video";
      mediaMessage = msg.message.videoMessage;
      isDirectMedia = true;
    }

    // 2. Check quoted message
    if (!mediaMessage && quotedMsg) {
      if (quotedMsg.imageMessage) {
        mediaType = "image";
        mediaMessage = quotedMsg.imageMessage;
      } else if (quotedMsg.videoMessage) {
        mediaType = "video";
        mediaMessage = quotedMsg.videoMessage;
      } else if (quotedMsg.stickerMessage) {
        mediaType = "sticker";
        mediaMessage = quotedMsg.stickerMessage;
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

    // 3. Check direct URL input (e.g. Giphy, Tenor, direct image/video URL)
    let urlToFetch = null;
    if (!mediaMessage && args.length > 0 && isUrl(args[0])) {
      urlToFetch = args[0];
    }

    if (!mediaMessage && !urlToFetch) {
      await reply(
        "💡 *Sticker Maker Usage:*\n\n" +
        "• Send an image/video with caption `-s`\n" +
        "• Reply to an image, video, GIF, or sticker with `-s`\n" +
        "• Convert with custom name: `-s Pack Name | Author Name`\n" +
        "• URL support: `-s https://media.giphy.com/...`"
      );
      return;
    }

    await react("⏳");

    try {
      let rawBuffer = null;
      let isAnimated = false;

      if (urlToFetch) {
        const response = await axios.get(urlToFetch, { responseType: "arraybuffer", timeout: 15000 });
        rawBuffer = Buffer.from(response.data);
        const contentType = response.headers["content-type"] || "";
        isAnimated = contentType.includes("gif") || contentType.includes("video") || urlToFetch.endsWith(".gif") || urlToFetch.endsWith(".mp4");
      } else {
        const mediaSource = isDirectMedia
          ? msg
          : { key: msg.key, message: { [`${mediaType}Message`]: mediaMessage } };

        rawBuffer = await downloadMediaMessage(mediaSource, "buffer", {});
        isAnimated = mediaType === "video" || mediaMessage.isAnimated || mediaMessage.mimetype?.includes("gif");
      }

      if (!rawBuffer || rawBuffer.length === 0) {
        await reply("❌ Failed to download the media.");
        return;
      }

      let webpBuffer;
      if (isAnimated) {
        webpBuffer = await convertVideoToSticker(rawBuffer);
      } else {
        webpBuffer = await convertImageToSticker(rawBuffer);
      }

      const finalSticker = addExifToWebp(webpBuffer, packName, authorName);

      await sock.sendMessage(
        remoteJid,
        { sticker: finalSticker },
        { quoted: msg }
      );

      await react("✅");
    } catch (err) {
      console.error("[Sticker] Error generating sticker:", err);
      await reply("❌ Failed to create sticker. Please make sure the image/video is valid and not corrupted.");
    }
  },
});
