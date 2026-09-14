// @ts-nocheck
"use strict";

const searchSessions = new Map();
let scClientId = null;

async function getSoundCloudClientId() {
  if (scClientId) return scClientId;

  try {
    const pageHtml = await (
      await fetch("https://soundcloud.com", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })
    ).text();

    const patterns = [
      /client_id\s*:\s*"([a-zA-Z0-9]{32})"/,
      /client_id=([a-zA-Z0-9]{32})/,
      /"clientId"\s*:\s*"([a-zA-Z0-9]{32})"/,
    ];

    for (const pattern of patterns) {
      const match = pageHtml.match(pattern);
      if (match?.[1]) {
        scClientId = match[1];
        return scClientId;
      }
    }

    const scriptUrls = (pageHtml.match(/https:\/\/[^"]*\.js/g) || []).slice(0, 5);
    for (const scriptUrl of scriptUrls) {
      try {
        const scriptText = await (await fetch(scriptUrl)).text();
        for (const pattern of patterns) {
          const match = scriptText.match(pattern);
          if (match?.[1]) {
            scClientId = match[1];
            return scClientId;
          }
        }
      } catch {
        continue;
      }
    }
  } catch {}

  scClientId = "KKzJxmw11tYpCs6T24P4uUYhqmjalG6M";
  return scClientId;
}

async function searchSoundCloud(query, limit = 5) {
  const clientId = await getSoundCloudClientId();
  const url = `https://api-mobi.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&limit=${limit}&client_id=${clientId}`;

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const data = await response.json();
  return data.collection || [];
}

async function getStreamUrl(trackId) {
  const clientId = await getSoundCloudClientId();
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/json, text/javascript, */*; q=0.1",
    "Accept-Language": "en-US,en;q=0.9",
    Origin: "https://soundcloud.com",
    Referer: "https://soundcloud.com/",
  };

  const endpoints = [
    `https://api-v2.soundcloud.com/tracks/${trackId}?client_id=${clientId}`,
    `https://api-mobi.soundcloud.com/tracks/${trackId}?client_id=${clientId}`,
  ];

  let transcodings = [];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { headers });
      if (!res.ok) continue;
      const json = await res.json();
      transcodings = json?.media?.transcodings || [];
      if (transcodings.length > 0) break;
    } catch {
      continue;
    }
  }

  if (!transcodings.length) {
    console.log(`[SoundCloud] No transcodings found for track ${trackId}`);
    return null;
  }

  const progressive = transcodings.find((t) => t.format?.protocol === "progressive");
  const hls = transcodings.find((t) => t.format?.protocol === "hls");
  const selected = progressive || hls;

  if (!selected) return null;

  try {
    const streamInfo = await (
      await fetch(`${selected.url}?client_id=${clientId}`, { headers })
    ).json();

    if (streamInfo?.url) {
      return {
        url: streamInfo.url,
        isHls: selected.format?.protocol === "hls",
      };
    }
    return null;
  } catch {
    return null;
  }
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

commandintro({
  name: "soundcloud",
  author: "Yugant Xettri",
  aliases: ["sc", "music"],
  role: 0,
  onStart: async (sock, msg, { reply, react, args }) => {
    const query = args.join(" ").trim();
    if (!query) {
      await reply("💡 Usage: *-soundcloud <song name>*\nExample: *-soundcloud Blinding Lights*");
      return;
    }

    await react("🔍");

    try {
      const tracks = await searchSoundCloud(query, 6);
      if (!tracks.length) {
        await reply(`❌ No tracks found for: _${query}_`);
        return;
      }

      let text = `🔎 Results for *"${query}"* on SoundCloud\n\n`;
      tracks.forEach((track, idx) => {
        const duration = track.duration ? formatDuration(track.duration) : "?:??";
        text += `\`[${idx + 1}]\` ${track.title} — ${track.user?.username || "Unknown"} (${duration})\n`;
      });
      text += "\n🎧 Reply with *1–" + tracks.length + "* to download your selected track.";

      const sentMsg = await reply(text);
      if (sentMsg?.key?.id) {
        searchSessions.set(sentMsg.key.id, { tracks });
        setTimeout(() => searchSessions.delete(sentMsg.key.id), 300 * 1000);
      }
      await react("✅");
    } catch (err) {
      console.error("[SoundCloud] Search error:", err);
      await reply("❌ Failed to search SoundCloud. Please try again.");
    }
  },

  onReply: async (sock, msg, { reply, react, senderText, remoteJid, quotedKey }) => {
    if (!quotedKey?.id) return;
    const session = searchSessions.get(quotedKey.id);
    if (!session) return;

    const selectionIndex = parseInt(senderText.trim(), 10);
    if (isNaN(selectionIndex) || selectionIndex < 1 || selectionIndex > session.tracks.length) {
      await reply(`⚠️ Please reply with a valid number between *1* and *${session.tracks.length}*.`);
      return;
    }

    const track = session.tracks[selectionIndex - 1];
    await react("⬇️");

    try {
      const stream = await getStreamUrl(track.id);
      if (!stream) {
        await reply("❌ This track is not streamable.");
        return;
      }

      if (stream.isHls) {
        await reply(
          `🎵 *${track.title}*\n` +
          `👤 ${track.user?.username}\n\n` +
          `⚠️ This track uses HLS streaming and cannot be sent directly as an MP3 file.\n` +
          `🔗 Stream link: ${stream.url}`
        );
        return;
      }

      const audioResponse = await fetch(stream.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      if (!audioResponse.ok) {
        await reply("❌ Failed to download audio. The track may be geo-restricted.");
        return;
      }

      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
      const cleanFileName = track.title.replace(/[\\/:*?"<>|]/g, "_");

      await sock.sendMessage(
        remoteJid,
        {
          audio: audioBuffer,
          mimetype: "audio/mpeg",
          ptt: false,
          fileName: `${cleanFileName}.mp3`,
        },
        { quoted: msg }
      );

      await react("✅");
      console.log(`[SoundCloud] Sent: ${track.title} by ${track.user?.username}`);
    } catch (err) {
      console.error("[SoundCloud] Download error:", err);
      await reply("❌ Failed to download the track. Please try again.");
    }
  },
});
