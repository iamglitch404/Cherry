// @ts-nocheck
"use strict";
createCommand({
  name: "help",
  author: "Yugant Xettri",
  aliases: ["h", "menu"],
  prefix: !0,
  onStart: async (r, c, { reply: s }) => {
    const n = global.getBotConfig().prefix,
      e = global.commands,
      o = new Set(e.values()),
      t = Array.from(o).map((a) => {
        const i = a.prefix === !1 ? "" : n,
          m = a.aliases ? ` (aliases: ${a.aliases.join(", ")})` : "";
        return `\u2022 *${i}${a.name}*${m}`;
      }).join(`
`);
    await s(t);
  },
});
