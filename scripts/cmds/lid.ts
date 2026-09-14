// @ts-nocheck
"use strict";

commandintro({
  name: "lid",
  author: "Yugant Xettri",
  aliases: ["mylid", "chatlid"],
  role: 0,
  onStart: async (sock, msg, { reply, senderJid }) => {
    let lid = "Not found";

    if (senderJid && senderJid.endsWith("@lid")) {
      lid = senderJid;
    } else {
      try {
        const matches = JSON.stringify(msg).match(/\b\d+(?::\d+)?@lid\b/g);
        if (matches) {
          const unique = Array.from(new Set(matches));
          const botLid = sock.authState?.creds?.me?.lid || "";
          const userLid = unique.find((id) => id !== botLid);
          if (userLid) lid = userLid;
        }
      } catch (err) {
        console.error("[LID] Error scanning for LID:", err);
      }
    }

    await reply(`*Your LID:* \`${lid}\``);
  },
});
