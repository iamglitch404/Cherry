// @ts-nocheck
"use strict";
createCommand({
  name: "unsend",
  author: "Yugant Xettri",
  aliases: ["del", "delete", "rm"],
  prefix: !0,
  onStart: async (t, m, i) => {
    const { remoteJid: a, quotedKey: e, reply: n, react: l } = i;
    if (!e) {
      await n("\u274C Please reply to a message you want me to unsend.");
      return;
    }
    const s = t.user?.id?.split(":")[0],
      o = t.user?.lid?.split(":")[0],
      r = (e.participant || "").split("@")[0]?.split(":")[0];
    (((s && r === s) || (o && r === o)) && (e.fromMe = !0),
      a && !a.endsWith("@g.us") && delete e.participant,
      console.log("[Unsend] Attempting to delete with key:", e));
    try {
      (await t.sendMessage(a, { delete: e }),
        console.log("[Unsend] Successfully sent delete command."),
        await l("\u{1F5D1}\uFE0F"));
    } catch (d) {
      (console.error("[Unsend Command] Error:", d),
        await n(
          "\u274C Failed to unsend the message. Note that I can only delete my own messages, or others' messages if I am an admin in this group.",
        ));
    }
  },
});
