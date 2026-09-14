// @ts-nocheck
"use strict";

commandintro({
  name: "jid",
  author: "Yugant Xettri",
  aliases: ["myjid", "chatjid"],
  role: 0,
  onStart: async (sock, msg, { reply, remoteJid, senderJid }) => {
    if (remoteJid?.endsWith("@g.us")) {
      let groupName = "Unknown Group";
      try {
        const metadata = await sock.groupMetadata(remoteJid);
        if (metadata?.subject) groupName = metadata.subject;
      } catch {}
      await reply(`*Group:* ${groupName}\n*JID:* \`${remoteJid}\``);
    } else {
      await reply(`*Your JID:* \`${senderJid}\``);
    }
  },
});
