// @ts-nocheck
"use strict";
createCommand({
  name: "jid",
  author: "Yugant Xettri",
  aliases: ["myjid", "chatjid"],
  prefix: !0,
  onStart: async (i, u, { reply: s, remoteJid: a, senderJid: n }) => {
    if (a?.endsWith("@g.us")) {
      let e = "Unknown";
      try {
        const t = await i.groupMetadata(a);
        t?.subject && (e = t.subject);
      } catch {}
      await s(`Group Name: ${e}
JID: \`${a}\``);
    } else await s(`Your JID: \`${n}\``);
  },
});
