// @ts-nocheck
"use strict";

commandintro({
  name: "unsend",
  author: "Yugant Xettri",
  aliases: ["del", "delete", "rm"],
  role: 0,
  onStart: async (sock, msg, context) => {
    const { remoteJid, quotedKey, reply, react } = context;

    if (!quotedKey) {
      await reply("❌ Please reply to the message you want me to unsend.");
      return;
    }

    const botId = (sock.user?.id || "").split(":")[0].replace(/\D/g, "");
    const botLid = (sock.user?.lid || "").split(":")[0].replace(/\D/g, "");
    const participantNumber = (quotedKey.participant || "").split("@")[0].split(":")[0].replace(/\D/g, "");

    if ((botId && participantNumber === botId) || (botLid && participantNumber === botLid)) {
      quotedKey.fromMe = true;
    }

    if (remoteJid && !remoteJid.endsWith("@g.us")) {
      delete quotedKey.participant;
    }

    try {
      await sock.sendMessage(remoteJid, { delete: quotedKey });
      await react("🗑️");
    } catch (err) {
      console.error("[Unsend] Error deleting message:", err);
      await reply(
        "❌ Failed to unsend the message. Note: I can only delete my own messages, or other messages if I am an admin in this group."
      );
    }
  },
});
