// @ts-nocheck
"use strict";
createCommand({
  name: "lid",
  author: "Yugant Xettri",
  aliases: ["mylid", "chatlid"],
  prefix: !0,
  onStart: async (s, n, { reply: a, senderJid: m }) => {
    let t = "Not found";
    try {
      const e = JSON.stringify(n).match(/\b\d+(?::\d+)?@lid\b/g);
      if (e) {
        const d = Array.from(new Set(e)),
          o = s.authState.creds.me?.lid || "",
          i = d.find((c) => c !== o);
        i && (t = i);
      }
    } catch (r) {
      console.error("Error scanning for LIDs:", r);
    }
    await a(`Your LID is: \`${t}\``);
  },
});
