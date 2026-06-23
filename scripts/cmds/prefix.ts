// @ts-nocheck
"use strict";
createCommand({
  name: "prefix",
  author: "Yugant Xettri",
  aliases: ["myprefix", "getprefix"],
  prefix: !1,
  onStart: async (r, t, { react: e, reply: a }) => {
    const i = global.getBotConfig().prefix;
    (await e("\u2139\uFE0F"), await a(`My current prefix is: *${i}*`));
  },
});
