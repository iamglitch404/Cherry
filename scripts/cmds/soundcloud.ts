// @ts-nocheck
"use strict";
const searchSessions = new Map();
let scClientId = null;
async function getScClientId() {
  if (scClientId) return scClientId;
  try {
    const o = await (
        await fetch("https://soundcloud.com", {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        })
      ).text(),
      t = [
        /client_id\s*:\s*"([a-zA-Z0-9]{32})"/,
        /client_id=([a-zA-Z0-9]{32})/,
        /"clientId"\s*:\s*"([a-zA-Z0-9]{32})"/,
      ];
    for (const e of t) {
      const r = o.match(e);
      if (r && r[1]) return ((scClientId = r[1]), scClientId);
    }
    const l = (o.match(/https:\/\/[^"]*\.js/g) || []).slice(0, 5);
    for (const e of l)
      try {
        const i = await (await fetch(e)).text();
        for (const s of t) {
          const n = i.match(s);
          if (n && n[1]) return ((scClientId = n[1]), scClientId);
        }
      } catch {
        continue;
      }
  } catch {}
  return ((scClientId = "KKzJxmw11tYpCs6T24P4uUYhqmjalG6M"), scClientId);
}
async function scSearch(c, o = 5) {
  const t = await getScClientId();
  return (
    (
      await (
        await fetch(
          `https://api-mobi.soundcloud.com/search/tracks?q=${encodeURIComponent(c)}&limit=${o}&client_id=${t}`,
          { headers: { "User-Agent": "Mozilla/5.0" } },
        )
      ).json()
    ).collection || []
  );
}
async function getStreamUrl(c) {
  const o = await getScClientId(),
    t = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json, text/javascript, */*; q=0.1",
      "Accept-Language": "en-US,en;q=0.9",
      Origin: "https://soundcloud.com",
      Referer: "https://soundcloud.com/",
    },
    l = [
      `https://api-v2.soundcloud.com/tracks/${c}?client_id=${o}`,
      `https://api-mobi.soundcloud.com/tracks/${c}?client_id=${o}`,
    ];
  let e = [];
  for (const n of l)
    try {
      const a = await fetch(n, { headers: t });
      if (!a.ok) continue;
      if (((e = (await a.json())?.media?.transcodings || []), e.length > 0))
        break;
    } catch {
      continue;
    }
  if (!e.length)
    return (
      console.log(`[SoundCloud] No transcodings found for track ${c}`),
      null
    );
  const r = e.find((n) => n.format?.protocol === "progressive"),
    i = e.find((n) => n.format?.protocol === "hls"),
    s = r || i;
  if (!s) return null;
  try {
    const a = await (
      await fetch(`${s.url}?client_id=${o}`, { headers: t })
    ).json();
    return a?.url ? { url: a.url, isHls: s.format?.protocol === "hls" } : null;
  } catch {
    return null;
  }
}
function formatDuration(c) {
  const o = Math.floor(c / 6e4),
    t = String(Math.floor((c % 6e4) / 1e3)).padStart(2, "0");
  return `${o}:${t}`;
}
createCommand({
  name: "soundcloud",
  author: "Yugant Xettri",
  aliases: ["sc", "music"],
  prefix: !0,
  onStart: async (c, o, { reply: t, react: l, args: e }) => {
    const r = e.join(" ").trim();
    if (!r) {
      await t(`\u{1F4A1} Usage: *-soundcloud <song name>*
Example: *-soundcloud Blinding Lights*`);
      return;
    }
    await l("\u{1F50D}");
    try {
      const i = await scSearch(r, 6);
      if (!i.length) {
        await t(`\u274C No tracks found for: _${r}_`);
        return;
      }
      let s = `\u{1F50E} Results for *"${r}"* on SoundCloud

`;
      (i.forEach((a, u) => {
        const d = a.duration ? formatDuration(a.duration) : "?:??";
        s += `\`[${u + 1}]\` ${a.title} \u2014 ${a.user?.username || "Unknown"} (${d})
`;
      }),
        (s += `
\u{1F3A7} Send *1\u2013${i.length}* to download your selected track.`));
      const n = await t(s);
      (n?.key?.id &&
        (searchSessions.set(n.key.id, { tracks: i }),
        setTimeout(() => searchSessions.delete(n.key.id), 300 * 1e3)),
        await l("\u2705"));
    } catch (i) {
      (console.error("[SoundCloud] Search error:", i),
        await t("\u274C Failed to search SoundCloud. Try again."));
    }
  },
  onReply: async (
    c,
    o,
    { reply: t, react: l, senderText: e, remoteJid: r, quotedKey: i },
  ) => {
    if (!i?.id) return;
    const s = searchSessions.get(i.id);
    if (!s) return;
    const n = parseInt(e.trim());
    if (isNaN(n) || n < 1 || n > s.tracks.length) {
      await t(
        `\u26A0\uFE0F Please reply with a number between *1* and *${s.tracks.length}*.`,
      );
      return;
    }
    const a = s.tracks[n - 1];
    await l("\u2B07\uFE0F");
    try {
      const u = await getStreamUrl(a.id);
      if (!u) {
        await t("\u274C This track is not streamable.");
        return;
      }
      if (u.isHls) {
        await t(`\u{1F3B5} *${a.title}*
\u{1F464} ${a.user?.username}

\u26A0\uFE0F This track uses HLS streaming and cannot be sent directly.
\u{1F517} Stream link: ${u.url}`);
        return;
      }
      const d = await fetch(u.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!d.ok) {
        await t(
          "\u274C Failed to download audio. Track may be geo-restricted.",
        );
        return;
      }
      const f = Buffer.from(await d.arrayBuffer()),
        m = a.title.replace(/[\\/:*?"<>|]/g, "_");
      (await c.sendMessage(
        r,
        { audio: f, mimetype: "audio/mpeg", ptt: !1, fileName: `${m}.mp3` },
        { quoted: o },
      ),
        await l("\u2705"),
        console.log(`[SoundCloud] Sent: ${a.title} by ${a.user?.username}`));
    } catch (u) {
      (console.error("[SoundCloud] Download error:", u),
        await t("\u274C Failed to download the track. Please try again."));
    }
  },
});
