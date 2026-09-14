// @ts-nocheck
"use strict";

commandintro({
  name: "credit",
  author: "Yugant Xettri",
  aliases: ["credits", "about", "author"],
  role: 0,
  countDown: 5,
  onStart: async (sock, msg, { reply, react }) => {
    await react("🍒");
    const text = [
      "🍒 *Cherry Bot*",
      "────────────────",
      "• *Author:* Yugant Xettri",
      "• *Platform:* Node.js & Baileys Multi-Device",
      "• *GitHub:* https://github.com/Yugant-Xettri/Cherry-V2",
      "",
      "A fast, modern WhatsApp bot built with care.",
      "Enjoy the freedom! ✨",
    ].join("\n");
    await reply(text);
  },
});
