// @ts-nocheck
"use strict";
createCommand({
  name: "welcome",
  author: "Yugant Xettri",
  aliases: ["setwelcome", "welcomeset"],
  prefix: !0,
  onStart: async (
    w,
    d,
    { args: c, remoteJid: e, reply: t, react: s, senderJid: i },
  ) => {
    if (!e.endsWith("@g.us")) {
      await t("\u274C This command can only be used inside a group.");
      return;
    }
    if (!global.isAdmin(i))
      try {
        const l = (await w.groupMetadata(e)).participants.find((m) => {
          const u = typeof m == "string" ? m : m.id;
          return u === i || u?.split(":")[0] + "@s.whatsapp.net" === i;
        });
        if (!(typeof l == "object" ? l?.admin : null)) {
          await t("\u274C Only group admins can use this command.");
          return;
        }
      } catch {
        await t("\u274C Could not verify your admin status.");
        return;
      }
    const a = global.__welcomeState || {},
      r = global.__welcomeMsg || {},
      n = c[0]?.toLowerCase();
    if (n === "on") {
      ((a[e] = !0),
        await s("\u2705"),
        await t(`\u2705 *Welcome messages are now ON* for this group.

New members will receive a welcome card with their profile picture.

\u{1F4A1} Tip: Set a custom message with:
\`-welcome set Your message here\`
Use *@user* to mention the new member and *@group* for the group name.`));
      return;
    }
    if (n === "off") {
      ((a[e] = !1),
        await s("\u{1F6AB}"),
        await t("\u{1F6AB} *Welcome messages are now OFF* for this group."));
      return;
    }
    if (n === "set") {
      const o = c.slice(1).join(" ").trim();
      if (!o) {
        await t(`\u274C Please provide a message.

Example: \`-welcome set Hello @user, welcome to @group! \u{1F389}\`

Placeholders:
\u2022 *@user* \u2192 mentions the new member
\u2022 *@group* \u2192 group name`);
        return;
      }
      ((r[e] = o),
        await s("\u270D\uFE0F"),
        await t(`\u2705 *Custom welcome message saved!*

Preview:
${o}`));
      return;
    }
    if (n === "reset") {
      (delete r[e],
        await s("\u{1F504}"),
        await t("\u{1F504} *Welcome message reset* to default."));
      return;
    }
    const g = a[e] !== void 0 ? a[e] : !0,
      f =
        r[e] || "_(default \u2014 shows member's profile picture + greeting)_";
    await t(`\u{1F4CB} *Welcome Command Settings*

Status: ${g ? "\u2705 ON" : "\u{1F6AB} OFF"}
Message: ${f}

*Usage:*
\u2022 \`-welcome on\` \u2014 enable welcome
\u2022 \`-welcome off\` \u2014 disable welcome
\u2022 \`-welcome set <msg>\` \u2014 set custom message
\u2022 \`-welcome reset\` \u2014 restore default message`);
  },
});
