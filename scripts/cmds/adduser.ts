// @ts-nocheck
"use strict";
export default {
  config: {
    name: "adduser",
    version: "1.5",
    author: "Yugant Xettri",
    countDown: 5,
    role: 2,
    description: {
      vi: "Th\xEAm th\xE0nh vi\xEAn v\xE0o box chat c\u1EE7a b\u1EA1n",
      en: "Add user to box chat of you",
    },
    category: "box chat",
    guide: { en: "   {pn} [phone number]" },
  },
  onStart: async function (d, h, u) {
    const { remoteJid: r, args: o, reply: e, react: t } = u;
    if (!r.endsWith("@g.us"))
      return e("\u274C This command can only be used in groups.");
    if (o.length === 0)
      return e(`\u2139\uFE0F Usage: adduser [phone number]
Example: adduser 1234567890`);
    let a = o.join("").replace(/[^0-9]/g, "");
    if (!a)
      return e(
        "\u274C Invalid phone number format. Please provide a valid number with country code.",
      );
    const n = `${a}@s.whatsapp.net`;
    try {
      const i = (await d.groupParticipantsUpdate(r, [n], "add"))[0]?.status;
      i === "200"
        ? (await t("\u2705"),
          await e(`\u2705 Successfully added @${a} to the group.`, {
            mentions: [n],
          }))
        : i === "403"
          ? (await t("\u274C"),
            await e(
              `\u274C Failed to add @${a}. They might have privacy settings preventing me from adding them, or I don't have admin privileges.`,
              { mentions: [n] },
            ))
          : i === "409"
            ? (await t("\u26A0\uFE0F"),
              await e(`\u26A0\uFE0F @${a} is already in the group.`, {
                mentions: [n],
              }))
            : i === "408"
              ? (await t("\u274C"),
                await e(
                  `\u274C Failed to add @${a}. They recently left the group and cannot be added back immediately.`,
                  { mentions: [n] },
                ))
              : i === "401"
                ? (await t("\u274C"),
                  await e(
                    `\u274C Failed to add @${a}. Please make sure the bot is an admin in this group!`,
                    { mentions: [n] },
                  ))
                : i === "402"
                  ? (await t("\u274C"),
                    await e(
                      `\u274C Failed to add @${a} (Status 402). This usually happens when the user's privacy settings restrict who can add them, or they have been blocked/recently left.`,
                      { mentions: [n] },
                    ))
                  : (await t("\u274C"),
                    await e(
                      `\u274C Failed to add @${a}. (Status: ${i || "Unknown"})`,
                      { mentions: [n] },
                    ));
    } catch (s) {
      (console.error("[AddUser Command] Error:", s),
        await t("\u274C"),
        await e(
          "\u274C An error occurred while trying to add the user. Please make sure I am an admin in this group.",
        ));
    }
  },
};
