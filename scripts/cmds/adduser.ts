// @ts-nocheck
"use strict";

commandintro({
  name: "adduser",
  author: "Yugant Xettri",
  aliases: ["add"],
  role: 1,
  countDown: 5,
  onStart: async (sock, msg, { remoteJid, args, reply, react }) => {
    if (!remoteJid.endsWith("@g.us")) {
      return reply("❌ This command can only be used inside a group.");
    }

    if (args.length === 0) {
      return reply(
        "ℹ️ Usage: -adduser <phone number>\n" +
        "Example: -adduser 1234567890"
      );
    }

    const cleanDigits = args.join("").replace(/[^0-9]/g, "");
    if (!cleanDigits || cleanDigits.length < 6) {
      return reply("❌ Please provide a valid phone number including country code.");
    }

    const userJid = `${cleanDigits}@s.whatsapp.net`;

    try {
      const response = await sock.groupParticipantsUpdate(remoteJid, [userJid], "add");
      const status = response?.[0]?.status;

      switch (status) {
        case "200":
          await react("✅");
          await reply(`✅ Successfully added @${cleanDigits} to the group.`, {
            mentions: [userJid],
          });
          break;

        case "403":
          await react("❌");
          await reply(
            `❌ Could not add @${cleanDigits}. Their privacy settings may prevent others from adding them directly, or the bot lacks admin privileges.`,
            { mentions: [userJid] }
          );
          break;

        case "409":
          await react("⚠️");
          await reply(`⚠️ @${cleanDigits} is already a member of this group.`, {
            mentions: [userJid],
          });
          break;

        case "408":
          await react("❌");
          await reply(
            `❌ Could not add @${cleanDigits}. They recently left the group and cannot be re-added immediately.`,
            { mentions: [userJid] }
          );
          break;

        case "401":
          await react("❌");
          await reply(
            `❌ Failed to add @${cleanDigits}. Please make sure the bot is an admin in this group!`,
            { mentions: [userJid] }
          );
          break;

        case "402":
          await react("❌");
          await reply(
            `❌ Could not add @${cleanDigits}. Their privacy settings restrict group additions.`,
            { mentions: [userJid] }
          );
          break;

        default:
          await react("❌");
          await reply(`❌ Could not add @${cleanDigits} (Status: ${status || "unknown"}).`, {
            mentions: [userJid],
          });
          break;
      }
    } catch (err) {
      console.error("[AddUser] Error:", err);
      await react("❌");
      await reply("❌ An error occurred while adding the user. Ensure the bot is an admin in this group.");
    }
  },
});
