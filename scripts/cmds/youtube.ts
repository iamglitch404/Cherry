// @ts-nocheck
"use strict";
const searchSessions = new Map();
async function ytSearch(u, m = 5) {
  const o = `https://www.youtube.com/results?search_query=${encodeURIComponent(u)}&sp=EgIQAQ%253D%253D`;
  try {
    const h = (
      await (
        await fetch(o, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
        })
      ).text()
    ).match(/var ytInitialData\s*=\s*({.+?});/);
    if (!h || !h[1]) return [];
    const n =
        JSON.parse(h[1]).contents?.twoColumnSearchResultsRenderer
          ?.primaryContents?.sectionListRenderer?.contents?.[0]
          ?.itemSectionRenderer?.contents || [],
      t = [];
    for (const r of n) {
      if (t.length >= m) break;
      const e = r.videoRenderer;
      if (!e) continue;
      let s = !1;
      if (e.thumbnailOverlays) {
        for (const d of e.thumbnailOverlays)
          if (d.thumbnailOverlayTimeStatusRenderer?.style === "SHORTS") {
            s = !0;
            break;
          }
      }
      if (
        ((e.title?.runs?.[0]?.text || "").toLowerCase().includes("#shorts") &&
          (s = !0),
        s)
      )
        continue;
      const w = e.videoId,
        g = e.title?.runs?.[0]?.text,
        f = e.lengthText?.simpleText || "?:??",
        i = e.ownerText?.runs?.[0]?.text || "Unknown",
        y = e.shortViewCountText?.simpleText || "";
      w &&
        g &&
        t.push({
          id: w,
          title: g,
          duration: f,
          author: i,
          views: y,
          url: `https://www.youtube.com/watch?v=${w}`,
        });
    }
    return t;
  } catch (c) {
    return (console.error("[YouTube] Parsing search results failed:", c), []);
  }
}
async function fetchYouTubeMediaDetails(u, m) {
  const o = await fetch(`${u}?url=${encodeURIComponent(m)}`);
  if (!o.ok) throw new Error(`API returned status ${o.status}`);
  return await o.json();
}
async function downloadMediaInChunks(u, m) {
  const o = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "*/*",
    Connection: "keep-alive",
  };
  let c = m;
  if (!c)
    try {
      const n = (
        await fetch(u, { headers: { ...o, Range: "bytes=0-0" } })
      ).headers.get("content-range");
      if (n) {
        const t = n.match(/\/(\d+)$/);
        t && t[1] && (c = parseInt(t[1]));
      }
    } catch (a) {
      console.error(
        "[YouTube] Failed to fetch content-length for chunking:",
        a,
      );
    }
  if (!c) {
    const a = await fetch(u, { headers: { ...o, Connection: "close" } });
    if (!a.ok) throw new Error(`Fallback fetch failed: ${a.status}`);
    return Buffer.from(await a.arrayBuffer());
  }
  const p = 1.5 * 1024 * 1024,
    h = [];
  for (let a = 0; a < c; a += p) {
    const n = Math.min(a + p - 1, c - 1),
      t = (async () => {
        for (let r = 1; r <= 3; r++) {
          try {
            const e = await fetch(u, {
              headers: { ...o, Range: `bytes=${a}-${n}` },
            });
            if (e.ok) {
              if (e.status === 200)
                throw new Error(
                  "Server returned 200 OK (ignored Range header). Chunking unsupported.",
                );
              return Buffer.from(await e.arrayBuffer());
            }
          } catch (e) {
            if (r === 3) throw e;
          }
          await new Promise((e) => setTimeout(e, 1e3));
        }
        throw new Error(`Failed to download chunk ${a}-${n}`);
      })();
    h.push(t);
  }
  try {
    const a = await Promise.all(h);
    return Buffer.concat(a);
  } catch (a) {
    console.warn(
      `[YouTube] Chunked download failed (${a}), falling back to single stream download...`,
    );
    const n = await fetch(u, { headers: { ...o, Connection: "close" } });
    if (!n.ok) throw new Error(`Fallback fetch failed: ${n.status}`);
    return Buffer.from(await n.arrayBuffer());
  }
}
createCommand({
  name: "youtube",
  author: "Yugant Xettri",
  aliases: ["yt", "play"],
  prefix: !0,
  onStart: async (u, m, { reply: o, react: c, args: p, senderJid: h }) => {
    const a = p.join(" ").trim();
    if (!a) {
      await o(`\u{1F4A1} Usage: *-youtube <song or video name>*
Example: *-youtube Shape of You*`);
      return;
    }
    await c("\u{1F50D}");
    try {
      const n = await ytSearch(a, 6);
      if (!n.length) {
        await o(`\u274C No results found for: _${a}_`);
        return;
      }
      let t = `\u{1F50E} Results for *"${a}"* on YouTube

`;
      (n.forEach((e, s) => {
        t += `\`[${s + 1}]\` ${e.title} \u2014 ${e.author} (${e.duration})
`;
      }),
        (t += `
\u{1F3A7} Reply with *1\u2013${n.length}* to select the video.`));
      const r = await o(t);
      (r?.key?.id &&
        (searchSessions.set(r.key.id, {
          type: "search",
          senderJid: h,
          key: r.key,
          videos: n,
        }),
        setTimeout(() => searchSessions.delete(r.key.id), 300 * 1e3)),
        await c("\u2705"));
    } catch (n) {
      (console.error("[YouTube] Search error:", n),
        await o("\u274C Failed to search YouTube. Try again."));
    }
  },
  onReply: async (
    u,
    m,
    {
      reply: o,
      react: c,
      senderText: p,
      remoteJid: h,
      quotedKey: a,
      senderJid: n,
    },
  ) => {
    if (!a?.id) return;
    const t = searchSessions.get(a.id);
    if (t && !(t.senderJid && n !== t.senderJid)) {
      if (t.type === "search") {
        const r = parseInt(p.trim());
        if (isNaN(r) || r < 1 || r > t.videos.length) {
          await o(
            `\u26A0\uFE0F Please reply with a number between *1* and *${t.videos.length}*.`,
          );
          return;
        }
        const e = t.videos[r - 1];
        await c("\u23F3");
        try {
          let w = "https://api.zenithapi.qzz.io/alldl";
          const g = `https://www.youtube.com/watch?v=${e.id}`,
            f = await fetchYouTubeMediaDetails(w, g);
          if (f.error || !f.medias || !f.medias.length) {
            await o(
              `\u274C Failed to retrieve download options from API: ${f.message || "No media metadata returned"}`,
            );
            return;
          }
          if (t.key)
            try {
              await u.sendMessage(h, { delete: t.key });
            } catch (d) {
              console.error(
                "[YouTube] Failed to delete search list message:",
                d,
              );
            }
          let i = `\u{1F3A5} *${f.title || e.title}*
`;
          (f.author &&
            (i += `Channel: ${f.author}
`),
            (i += `Duration: ${e.duration}

`),
            (i += `Please choose a format to download:
`),
            (i += "`[1]` Video (Highest quality with audio)\n"),
            (i += "`[2]` Audio (Best quality)\n\n"),
            (i += "Reply to this message with *1* or *2* to download."));
          const y = await o(i);
          (y?.key?.id &&
            (searchSessions.set(y.key.id, {
              type: "choice",
              senderJid: t.senderJid,
              key: y.key,
              videoId: e.id,
              videoDetails: f,
            }),
            setTimeout(() => searchSessions.delete(y.key.id), 300 * 1e3)),
            await c("\u2705"));
        } catch (s) {
          (console.error("[YouTube] Details fetch error:", s),
            await o(
              "\u274C Failed to fetch video download options. Please try again.",
            ));
        }
      } else if (t.type === "choice") {
        const r = p.trim(),
          e = t.videoDetails;
        if (r !== "1" && r !== "2") {
          await o(
            "\u26A0\uFE0F Invalid choice. Please reply with *1* for Video or *2* for Audio.",
          );
          return;
        }
        if ((await c("\u2B07\uFE0F"), t.key))
          try {
            await u.sendMessage(h, { delete: t.key });
          } catch (s) {
            console.error("[YouTube] Failed to delete choice message:", s);
          }
        try {
          if (r === "1") {
            const s = e.medias.filter(
              (i) =>
                i.type === "video" &&
                (i.is_audio === !0 ||
                  i.audioQuality ||
                  i.mimeType?.includes("mp4a")),
            );
            s.sort((i, y) => (y.height || 0) - (i.height || 0));
            const l = s[0] || e.medias.find((i) => i.type === "video");
            if (!l || !l.url) {
              await o("\u274C No video formats found for this track.");
              return;
            }
            const w = l.clen ? parseInt(l.clen) : void 0,
              g = await downloadMediaInChunks(l.url, w),
              f = (e.title || "video").replace(/[\\/:*?"<>|]/g, "_");
            (await u.sendMessage(
              h,
              {
                video: g,
                mimetype: "video/mp4",
                fileName: `${f}.mp4`,
                caption: `\u{1F3A5} *${e.title}*`,
              },
              { quoted: m },
            ),
              await c("\u2705"),
              searchSessions.delete(a.id));
          } else if (r === "2") {
            const s = e.medias.filter(
              (d) =>
                (d.type === "video" || d.is_video === !0 || d.has_audio) &&
                (d.hasAudio === !0 ||
                  d.is_audio === !0 ||
                  d.has_video === !0) &&
                (d.extension === "mp4" || d.ext === "mp4"),
            );
            s.sort((d, v) => (d.height || 0) - (v.height || 0));
            const l =
              s[0] ||
              e.medias.find((d) => d.extension === "mp4" || d.ext === "mp4");
            if (!l || !l.url) {
              await o("\u274C No suitable audio formats found for this track.");
              return;
            }
            const w = l.clen ? parseInt(l.clen) : void 0,
              g = await downloadMediaInChunks(l.url, w),
              f = (e.title || "audio").replace(/[\\/:*?"<>|]/g, "_"),
              i = l.extension || l.ext || "m4a",
              y = i === "m4a" || i === "mp4" ? "audio/mp4" : "audio/mpeg";
            (await u.sendMessage(
              h,
              { audio: g, mimetype: y, ptt: !1, fileName: `${f}.${i}` },
              { quoted: m },
            ),
              await c("\u2705"),
              searchSessions.delete(a.id));
          }
        } catch (s) {
          (console.error("[YouTube] Download/send error:", s),
            await o(
              "\u274C Failed to download and send the file. Please try again.",
            ));
        }
      }
    }
  },
});
