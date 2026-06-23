// @ts-nocheck
"use strict";
createCommand({
  name: "ping",
  author: "Yugant Xettri",
  aliases: ["p"],
  prefix: !0,
  onStart: async (i, c, { react: n, reply: o, edit: e, senderNumber: s }) => {
    await n("\u{1F3D3}");
    const m = Date.now(),
      t = await o("\u{1F3D3} pong! *...ms*"),
      a = Date.now() - m;
    (t?.key && (await e(`\u{1F3D3} pong! *${a}ms*`, t.key)),
      console.log(`[Command] Replied to ${s} with pong! (${a}ms)`));
  },
});
