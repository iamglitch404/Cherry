// @ts-nocheck
"use strict";

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);
const searchSessions = new Map();

function isYouTubeUrl(text) {
  return /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i.test(text);
}

function extractVideoId(text) {
  const match = text.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  return match ? match[1] : null;
}

async function searchYouTube(query, limit = 6) {
  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      `ytsearch${limit}:${query}`,
      "--print",
      "%(id)s\t%(title)s\t%(duration_string)s\t%(channel)s",
      "--no-warnings",
      "--flat-playlist",
    ]);

    const lines = stdout.trim().split("\n").filter(Boolean);
    return lines.map((line) => {
      const [id, title, duration, channel] = line.split("\t");
      return {
        id,
        title: title || "Unknown Title",
        duration: duration || "?:??",
        channel: channel || "Unknown",
        url: `https://www.youtube.com/watch?v=${id}`,
      };
    });
  } catch (err) {
    console.error("[YouTube/yt-dlp] Search error:", err);
    return [];
  }
}

async function getVideoDetails(videoUrl) {
  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      videoUrl,
      "--print",
      "%(id)s\t%(title)s\t%(duration_string)s\t%(channel)s",
      "--no-warnings",
    ]);

    const [id, title, duration, channel] = stdout.trim().split("\t");
    return {
      id,
      title: title || "YouTube Video",
      duration: duration || "?:??",
      channel: channel || "Unknown",
      url: `https://www.youtube.com/watch?v=${id}`,
    };
  } catch (err) {
    console.error("[YouTube/yt-dlp] Details error:", err);
    return null;
  }
}

async function downloadAudio(videoId) {
  const outputPath = path.join(os.tmpdir(), `cherry_audio_${videoId}_${Date.now()}.mp3`);

  await execFileAsync("yt-dlp", [
    "-x",
    "--audio-format", "mp3",
    "--audio-quality", "0",
    "--max-filesize", "60M",
    "-o", outputPath,
    `https://www.youtube.com/watch?v=${videoId}`,
  ]);

  const fileBuffer = await fs.promises.readFile(outputPath);
  await fs.promises.unlink(outputPath).catch(() => {});
  return fileBuffer;
}

async function downloadVideo(videoId) {
  const outputPath = path.join(os.tmpdir(), `cherry_video_${videoId}_${Date.now()}.mp4`);

  await execFileAsync("yt-dlp", [
    "-f", "bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/bv*[height<=720]+ba/b",
    "--merge-output-format", "mp4",
    "--max-filesize", "70M",
    "-o", outputPath,
    `https://www.youtube.com/watch?v=${videoId}`,
  ]);

  const fileBuffer = await fs.promises.readFile(outputPath);
  await fs.promises.unlink(outputPath).catch(() => {});
  return fileBuffer;
}

commandintro({
  name: "youtube",
  author: "Yugant Xettri",
  aliases: ["yt", "play", "ytdl"],
  role: 0,
  onStart: async (sock, msg, { reply, react, args, senderJid }) => {
    const input = args.join(" ").trim();
    if (!input) {
      await reply(
        "💡 *YouTube Downloader*\n\n" +
        "• Search: `-youtube <song or video name>`\n" +
        "• Direct Link: `-youtube https://youtu.be/...`\n" +
        "• Aliases: `yt`, `play`, `ytdl`"
      );
      return;
    }

    // Direct YouTube link handling
    if (isYouTubeUrl(input)) {
      await react("🔍");
      const videoId = extractVideoId(input);
      const details = await getVideoDetails(`https://www.youtube.com/watch?v=${videoId}`);

      if (!details) {
        await reply("❌ Could not fetch information for this YouTube video.");
        return;
      }

      const menu =
        `🎥 *${details.title}*\n` +
        `👤 Channel: ${details.channel}\n` +
        `⏱️ Duration: ${details.duration}\n\n` +
        "Please choose a format to download:\n" +
        "`[1]` Video (720p MP4)\n" +
        "`[2]` Audio (High Quality MP3)\n\n" +
        "Reply to this message with *1* or *2*.";

      const sentMsg = await reply(menu);
      if (sentMsg?.key?.id) {
        searchSessions.set(sentMsg.key.id, {
          type: "choice",
          senderJid,
          key: sentMsg.key,
          videoId: details.id,
          title: details.title,
        });
        setTimeout(() => searchSessions.delete(sentMsg.key.id), 300 * 1000);
      }
      await react("✅");
      return;
    }

    // Keyword search handling
    await react("🔍");
    try {
      const videos = await searchYouTube(input, 6);
      if (!videos.length) {
        await reply(`❌ No results found for: _${input}_`);
        return;
      }

      let text = `🔎 Results for *"${input}"* on YouTube:\n\n`;
      videos.forEach((video, index) => {
        text += `\`[${index + 1}]\` ${video.title} — ${video.channel} (${video.duration})\n`;
      });
      text += `\n🎧 Reply with *1–${videos.length}* to select the video.`;

      const sentMsg = await reply(text);
      if (sentMsg?.key?.id) {
        searchSessions.set(sentMsg.key.id, {
          type: "search",
          senderJid,
          key: sentMsg.key,
          videos,
        });
        setTimeout(() => searchSessions.delete(sentMsg.key.id), 300 * 1000);
      }
      await react("✅");
    } catch (err) {
      console.error("[YouTube] Search error:", err);
      await reply("❌ Failed to search YouTube. Please try again.");
    }
  },

  onReply: async (sock, msg, { reply, react, senderText, remoteJid, quotedKey, senderJid }) => {
    if (!quotedKey?.id) return;
    const session = searchSessions.get(quotedKey.id);
    if (!session) return;

    if (session.senderJid && senderJid !== session.senderJid) {
      return;
    }

    if (session.type === "search") {
      const index = parseInt(senderText.trim(), 10);
      if (isNaN(index) || index < 1 || index > session.videos.length) {
        await reply(`⚠️ Please reply with a number between *1* and *${session.videos.length}*.`);
        return;
      }

      const selected = session.videos[index - 1];

      if (session.key) {
        try {
          await sock.sendMessage(remoteJid, { delete: session.key });
        } catch {}
      }

      const menu =
        `🎥 *${selected.title}*\n` +
        `👤 Channel: ${selected.channel}\n` +
        `⏱️ Duration: ${selected.duration}\n\n` +
        "Please choose a format to download:\n" +
        "`[1]` Video (720p MP4)\n" +
        "`[2]` Audio (High Quality MP3)\n\n" +
        "Reply to this message with *1* or *2*.";

      const menuMsg = await reply(menu);
      if (menuMsg?.key?.id) {
        searchSessions.set(menuMsg.key.id, {
          type: "choice",
          senderJid: session.senderJid,
          key: menuMsg.key,
          videoId: selected.id,
          title: selected.title,
        });
        setTimeout(() => searchSessions.delete(menuMsg.key.id), 300 * 1000);
      }
      searchSessions.delete(quotedKey.id);
      await react("✅");
    } else if (session.type === "choice") {
      const choice = senderText.trim();
      if (choice !== "1" && choice !== "2") {
        await reply("⚠️ Invalid choice. Please reply with *1* for Video or *2* for Audio.");
        return;
      }

      await react("⏳");

      if (session.key) {
        try {
          await sock.sendMessage(remoteJid, { delete: session.key });
        } catch {}
      }

      const safeTitle = (session.title || "youtube").replace(/[\\/:*?"<>|]/g, "_");

      try {
        if (choice === "1") {
          const videoBuffer = await downloadVideo(session.videoId);

          await sock.sendMessage(
            remoteJid,
            {
              video: videoBuffer,
              mimetype: "video/mp4",
              fileName: `${safeTitle}.mp4`,
              caption: `🎥 *${session.title}*`,
            },
            { quoted: msg }
          );

          await react("✅");
          searchSessions.delete(quotedKey.id);
        } else if (choice === "2") {
          const audioBuffer = await downloadAudio(session.videoId);

          await sock.sendMessage(
            remoteJid,
            {
              audio: audioBuffer,
              mimetype: "audio/mpeg",
              ptt: false,
              fileName: `${safeTitle}.mp3`,
            },
            { quoted: msg }
          );

          await react("✅");
          searchSessions.delete(quotedKey.id);
        }
      } catch (err) {
        console.error("[YouTube/yt-dlp] Download error:", err);
        const errMsg = err?.message?.includes("max-filesize")
          ? "❌ File exceeds the maximum allowed size (70MB)."
          : "❌ Failed to download the requested media with yt-dlp. Please try again.";
        await reply(errMsg);
      }
    }
  },
});
