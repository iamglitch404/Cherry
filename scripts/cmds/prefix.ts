// @ts-nocheck
"use strict";

commandintro({
  name: "prefix",
  author: "Yugant Xettri",
  aliases: ["myprefix", "getprefix"],
  role: 0,
  onStart: async (sock, msg, { react, reply }) => {
    const prefix = global.getBotConfig().prefix || "!";
    await react("ℹ️");
    await reply(`My current prefix is: *${prefix}*`);
  },
});
