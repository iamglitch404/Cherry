// @ts-nocheck
"use strict";
import { GoogleGenerativeAI as Y } from "@google/generative-ai";
import { downloadMediaMessage as j } from "@whiskeysockets/baileys";
(global.geminiChatHistory || (global.geminiChatHistory = new Map()),
  (!global.geminiSentMessageIds ||
    global.geminiSentMessageIds instanceof Set) &&
    (global.geminiSentMessageIds = new Map()));
const API_KEY = "AQ.Ab8RN6LU7UKIh0FWYZx5SuUM4tYvxz0HSYIErgqgYqDVOLZ7Ag",
  v = global.geminiChatHistory,
  _ = global.geminiSentMessageIds;
async function C(p, e, n, M) {
  const {
      reply: o,
      react: d,
      args: h,
      remoteJid: f,
      quotedMsg: a,
      senderJid: S,
    } = n,
    x = API_KEY;
  if (!x || x === "YOUR_GEMINI_API_KEY_HERE") {
    await o(
      "\u274C Gemini API key not set in the script.\n\nGet a free key at: https://aistudio.google.com/app/apikey",
    );
    return;
  }
  let s = null,
    t = null,
    r = !1;
  e.message?.imageMessage
    ? ((s = "image"), (t = e.message.imageMessage), (r = !0))
    : a?.imageMessage
      ? ((s = "image"), (t = a.imageMessage))
      : e.message?.documentMessage
        ? ((s = "document"), (t = e.message.documentMessage), (r = !0))
        : a?.documentMessage
          ? ((s = "document"), (t = a.documentMessage))
          : e.message?.videoMessage
            ? ((s = "video"), (t = e.message.videoMessage), (r = !0))
            : a?.videoMessage
              ? ((s = "video"), (t = a.videoMessage))
              : e.message?.audioMessage
                ? ((s = "audio"), (t = e.message.audioMessage), (r = !0))
                : a?.audioMessage && ((s = "audio"), (t = a.audioMessage));
  let g = M !== void 0 ? M : h.join(" ").trim();
  if (!g && r && t?.caption) {
    const i = global.getBotConfig(),
      l = t.caption || "";
    g = (l.startsWith(i.prefix) ? l.slice(i.prefix.length).trim() : l)
      .split(/\s+/)
      .slice(1)
      .join(" ")
      .trim();
  }
  const A = g.toLowerCase();
  if (A === "reset" || A === "clear") {
    (v.delete(f),
      await o("\u{1F9F9} Gemini chat memory has been cleared for this chat."));
    return;
  }
  if (!t && !g) {
    await o(`\u{1F4A1} Usage:
\u2022 *-gemini <question>*
\u2022 Reply to or send a document/image/video/audio with *-gemini <question>*
\u2022 Use *-gemini reset* or *-gemini clear* to clear conversation memory.`);
    return;
  }
  await d("\u{1F916}");
  try {
    const l = new Y(x).getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction:
        "You are a helpful and fun conversational AI. You MUST respond ONLY in casual Romanized Nepali (Nepenglish), meaning Nepali language written in the English alphabet. Keep your answers very short, friendly, and natural like a text message.",
    });
    let G = v.get(f) || [],
      u = [];
    if (t) {
      const m = r ? e : { key: e.key, message: { [`${s}Message`]: t } },
        y = await j(m, "buffer", {}),
        P =
          t.mimetype ||
          (s === "image"
            ? "image/jpeg"
            : s === "video"
              ? "video/mp4"
              : s === "audio"
                ? "audio/mp4"
                : "application/octet-stream");
      let w = "";
      (s === "document" &&
        t.fileName &&
        (w = `[Attached File: ${t.fileName}]
`),
        u.push({ text: w + (g || `Describe or analyze this ${s}.`) }),
        u.push({ inlineData: { data: y.toString("base64"), mimeType: P } }));
    } else u.push({ text: g });
    const k = l.startChat({ history: G });
    let E;
    const T = 3,
      N = 3e3;
    for (let m = 1; m <= T; m++)
      try {
        E = await k.sendMessage(u);
        break;
      } catch (y) {
        if ((y?.message?.includes("503") || y?.status === 503) && m < T)
          (console.log(`[Gemini] 503 on attempt ${m}, retrying in ${N}ms...`),
            await new Promise((w) => setTimeout(w, N)));
        else throw y;
      }
    let b = E.response.text().trim();
    b = b.replace(/\*\*/g, "*");
    const R = await o(b || "\u{1F914} No response from Gemini.");
    R?.key?.id && _.set(R.key.id, S);
    let c = await k.getHistory();
    const H = 20;
    (c.length > H && ((c = c.slice(-H)), c[0]?.role === "model" && c.shift()),
      v.set(f, c));
  } catch (i) {
    (console.error("[Gemini] Error:", i),
      i?.message?.includes("503") ||
        i?.status === 503 ||
        (await o(`\u274C Gemini error: ${i?.message || String(i)}`)));
  }
}
createCommand({
  name: "gemini",
  author: "Yugant Xettri",
  aliases: ["ai", "ask"],
  prefix: !0,
  onStart: async (p, e, n) => {
    await C(p, e, n);
  },
  onReply: async (p, e, n) => {
    const { senderJid: M } = n,
      d = (
        e.message?.extendedTextMessage?.contextInfo ||
        e.message?.imageMessage?.contextInfo ||
        e.message?.videoMessage?.contextInfo ||
        e.message?.documentMessage?.contextInfo
      )?.stanzaId,
      h = d ? _.get(d) : null;
    if (d && h) {
      if (M !== h) return;
      const f = global.getBotConfig(),
        a = n.senderText || "";
      if (!a.startsWith(f.prefix)) {
        const I = a.trim();
        await C(p, e, n, I);
      }
    }
  },
});
