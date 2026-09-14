// @ts-nocheck
"use strict";

commandintro({
  name: "ping",
  author: "Yugant Xettri",
  aliases: ["p"],
  role: 0,
  onStart: async (sock, msg, { react, reply, edit }) => {
    await react("🏓");
    const startTime = Date.now();
    const sent = await reply("🏓 pong! *...ms*");
    const latency = Date.now() - startTime;

    if (sent?.key) {
      await edit(`🏓 pong! *${latency}ms*`, sent.key);
    }
  },
});
