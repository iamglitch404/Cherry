// @ts-nocheck
"use strict";
const API_KEY = "ac8iheK4T5nFFi5eevMqYliVRQFq2sJA";
(global.mistralChatHistory || (global.mistralChatHistory = new Map()),
  global.mistralSentMessageIds || (global.mistralSentMessageIds = new Map()));
const chatHistoryMap = global.mistralChatHistory,
  mistralSentMessageIds = global.mistralSentMessageIds;
async function executeMistral(f, e, r, m) {
  const {
    reply: t,
    react: n,
    args: y,
    quotedMsg: p,
    remoteJid: g,
    senderJid: w,
  } = r;
  let a = null,
    s = null,
    M = !1;
  e.message?.imageMessage
    ? ((a = "image"), (s = e.message.imageMessage), (M = !0))
    : p?.imageMessage && ((a = "image"), (s = p.imageMessage));
  let l = m !== void 0 ? m : y.join(" ").trim();
  !l &&
    M &&
    s?.caption &&
    (l = (s.caption || "").split(/\s+/).slice(1).join(" ").trim());
  const x = l.toLowerCase();
  if (x === "reset" || x === "clear") {
    (chatHistoryMap.delete(g),
      await t("\u{1F9F9} Mistral chat memory has been cleared for this chat."));
    return;
  }
  if (!l && !s) {
    await t(`\u{1F4A1} Usage: *ai <your question>*
Or reply to an image with *ai <question>*
Use *ai reset* to clear memory.`);
    return;
  }
  await n("\u{1F916}");
  try {
    let i = l || "Describe this image.",
      I = s ? "pixtral-12b-2409" : "mistral-large-latest";
    if (s) {
      const { downloadMediaMessage: c } =
          await import("@whiskeysockets/baileys"),
        h = M ? e : { key: e.key, message: { imageMessage: s } },
        T = await c(h, "buffer", {}),
        S = s.mimetype || "image/jpeg",
        k = T.toString("base64");
      i = [
        { type: "text", text: l || "Describe this image." },
        { type: "image_url", image_url: { url: `data:${S};base64,${k}` } },
      ];
    }
    let o = chatHistoryMap.get(g) || [];
    const b = [
        {
          role: "system",
          content:
            "You are a helpful and fun conversational AI. You MUST respond ONLY in casual Romanized Nepali (Nepenglish), meaning Nepali language written in the English alphabet. Keep your answers very short, friendly, and natural like a text message. Format any bold text using single asterisks like *this*.",
        },
        ...o,
        { role: "user", content: i },
      ],
      u = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({ model: I, messages: b }),
      });
    if (!u.ok) {
      const c = await u.json().catch(() => ({}));
      throw (
        console.error("[Mistral] API Error:", c),
        new Error(`API Error ${u.status}: ${c.message || "Unknown error"}`)
      );
    }
    let d = (await u.json()).choices?.[0]?.message?.content?.trim();
    if (d) {
      d = d.replace(/\*\*/g, "*");
      const c = await t(d);
      (c?.key?.id && mistralSentMessageIds.set(c.key.id, w),
        o.push({ role: "user", content: typeof i == "string" ? i : l }),
        o.push({ role: "assistant", content: d }));
      const h = 16;
      (o.length > h && (o = o.slice(o.length - h)),
        chatHistoryMap.set(g, o),
        await n("\u2705"));
    } else
      (await t("\u{1F914} Mistral did not return a response."),
        await n("\u274C"));
  } catch (i) {
    (console.error("[Mistral] Error:", i),
      await t(`\u274C Mistral Error: ${i.message}`),
      await n("\u274C"));
  }
}
createCommand({
  name: "ai",
  author: "Yugant Xettri",
  prefix: !1,
  onStart: async (f, e, r) => {
    const t = (
      e.message?.extendedTextMessage?.contextInfo ||
      e.message?.imageMessage?.contextInfo ||
      e.message?.videoMessage?.contextInfo ||
      e.message?.documentMessage?.contextInfo
    )?.stanzaId;
    (t && mistralSentMessageIds.has(t)) || (await executeMistral(f, e, r));
  },
  onReply: async (f, e, r) => {
    const { senderJid: m } = r,
      n = (
        e.message?.extendedTextMessage?.contextInfo ||
        e.message?.imageMessage?.contextInfo ||
        e.message?.videoMessage?.contextInfo ||
        e.message?.documentMessage?.contextInfo
      )?.stanzaId,
      y = n ? mistralSentMessageIds.get(n) : null;
    if (n && y) {
      if (m !== y) return;
      const p = global.getBotConfig(),
        g = r.senderText || "";
      if (!g.startsWith(p.prefix)) {
        let a = g.trim();
        (a.toLowerCase().startsWith("ai ")
          ? (a = a.substring(3).trim())
          : a.toLowerCase() === "ai" && (a = ""),
          await executeMistral(f, e, r, a));
      }
    }
  },
});
