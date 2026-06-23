// @ts-nocheck
"use strict";
export default {
  config: {
    name: "goodbye",
    author: "Yugant Xettri",
    aliases: ["setgoodbye", "leave", "setleave", "goodbyeset"],
    prefix: !0,
    role: 2,
    description: { en: "Configure the goodbye/leave message for this group" },
    category: "group",
    guide: { en: "   {pn} [on | off | set <msg> | reset]" },
  },
  onStart: async function (u, l, i) {
    const { args: g, remoteJid: e, reply: o, react: s } = i,
      t = global.__goodbyeState || {},
      n = global.__goodbyeMsg || {},
      a = g[0]?.toLowerCase();
    if (a === "on") {
      ((t[e] = !0),
        await s("\u2705"),
        await o(`\u2705 *Goodbye messages are now ON* for this group.

When a member leaves, the group will be notified.

\u{1F4A1} Tip: Set a custom message with:
\`!goodbye set Your message here\`
Use *@user* to mention the member and *@group* for the group name.`));
      return;
    }
    if (a === "off") {
      ((t[e] = !1),
        await s("\u{1F6AB}"),
        await o("\u{1F6AB} *Goodbye messages are now OFF* for this group."));
      return;
    }
    if (a === "set") {
      const r = g.slice(1).join(" ").trim();
      if (!r) {
        await o(`\u274C Please provide a message.

Example: \`!goodbye set We'll miss you @user! \u{1F499}\`

Placeholders:
\u2022 *@user* \u2192 mentions the leaving member
\u2022 *@group* \u2192 group name`);
        return;
      }
      ((n[e] = r),
        await s("\u270D\uFE0F"),
        await o(`\u2705 *Custom goodbye message saved!*

Preview:
${r}`));
      return;
    }
    if (a === "reset") {
      (delete n[e],
        await s("\u{1F504}"),
        await o("\u{1F504} *Goodbye message reset* to default."));
      return;
    }
    const d = t[e] !== void 0 ? t[e] : !1,
      m = n[e] || "_(default \u2014 farewell text with member mention)_";
    await o(`\u{1F4CB} *Goodbye / Leave Command Settings*

Status: ${d ? "\u2705 ON" : "\u{1F6AB} OFF"}
Message: ${m}

*Usage:*
\u2022 \`!goodbye on\` \u2014 enable goodbye
\u2022 \`!goodbye off\` \u2014 disable goodbye
\u2022 \`!goodbye set <msg>\` \u2014 set custom message
\u2022 \`!goodbye reset\` \u2014 restore default message

_Aliases: \`leave\`, \`setleave\`, \`setgoodbye\`_`);
  },
};
