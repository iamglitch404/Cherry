// @ts-nocheck
"use strict";

const timeout = (ms) =>
  new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

async function queryProfilePictureUrl(sock, jid, type) {
  const domain = jid.split("@")[1] || "s.whatsapp.net";
  const queryPromise = sock.query({
    tag: "iq",
    attrs: { target: jid, to: domain, type: "get", xmlns: "w:profile:picture" },
    content: [{ tag: "picture", attrs: { type, query: "url" } }],
  });

  const response = await Promise.race([queryPromise, timeout(5000)]);
  if (Array.isArray(response?.content)) {
    const pictureNode = response.content.find((item) => item.tag === "picture");
    return pictureNode?.attrs?.url || null;
  }
  return null;
}

commandintro({
  name: "pfp",
  author: "Yugant Xettri",
  aliases: ["profile", "avatar"],
  role: 0,
  onStart: async (sock, msg, { args, senderJid, remoteJid, reply }) => {
    let targetJid = senderJid;
    const contextInfo =
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo ||
      msg.message?.documentMessage?.contextInfo;

    // Check quoted message first
    if (contextInfo?.quotedMessage) {
      targetJid = contextInfo.participant || senderJid;
    }

    // Check mentions
    const mentions = contextInfo?.mentionedJid || [];
    if (mentions.length > 0) {
      targetJid = mentions[0];
    } else if (args.length > 0) {
      const rawText = args.join(" ");
      const digits = rawText.replace(/\D/g, "");
      if (digits.length >= 7) {
        targetJid = rawText.includes("lid") ? `${digits}@lid` : `${digits}@s.whatsapp.net`;
      }
    }

    async function fetchPfpUrl(jid) {
      try {
        const highRes = await queryProfilePictureUrl(sock, jid, "image");
        if (highRes) return highRes;
      } catch {}

      try {
        const preview = await queryProfilePictureUrl(sock, jid, "preview");
        if (preview) return preview;
      } catch {}

      try {
        const native = await sock.profilePictureUrl(jid, "image");
        if (native) return native;
      } catch {}

      return null;
    }

    try {
      let pfpUrl = await fetchPfpUrl(targetJid);

      if (!pfpUrl && targetJid.endsWith("@s.whatsapp.net")) {
        const fallbackLid = targetJid.replace("@s.whatsapp.net", "@lid");
        pfpUrl = await fetchPfpUrl(fallbackLid);
        if (pfpUrl) targetJid = fallbackLid;
      }

      if (!pfpUrl) {
        throw new Error("No profile picture found");
      }

      const targetNumber = targetJid.split("@")[0];
      await sock.sendMessage(
        remoteJid,
        {
          image: { url: pfpUrl },
          caption: `📸 Profile picture of @${targetNumber}`,
          mentions: [targetJid],
        },
        { quoted: msg }
      );
    } catch (err) {
      const targetNumber = targetJid.split("@")[0];
      await reply(
        `❌ Could not retrieve profile picture for @${targetNumber}. The user may not have a profile picture set or their privacy settings prevent viewing it.`,
        { mentions: [targetJid] }
      );
    }
  },
});
