// @ts-nocheck
"use strict";

commandintro({
  name: "welcome",
  author: "Yugant Xettri",
  aliases: ["setwelcome", "welcomeset"],
  role: 1,
  onStart: async (sock, msg, { args, remoteJid, reply, react, senderJid }) => {
    if (!remoteJid.endsWith("@g.us")) {
      await reply("❌ This command can only be used inside a group.");
      return;
    }

    if (!global.isAdmin(senderJid)) {
      try {
        const metadata = await sock.groupMetadata(remoteJid);
        const resolvedSender = global.resolvePhoneNumber ? global.resolvePhoneNumber(senderJid) : null;
        const senderClean = senderJid?.split("@")[0]?.split(":")[0]?.replace(/\D/g, "");

        const participant = metadata.participants.find((p) => {
          const userJid = typeof p === "string" ? p : p.id;
          const userClean = userJid?.split("@")[0]?.split(":")[0]?.replace(/\D/g, "");
          const pnClean = p?.phoneNumber?.split("@")[0]?.split(":")[0]?.replace(/\D/g, "");

          return (
            userJid === senderJid ||
            userClean === senderClean ||
            (resolvedSender && (userClean === resolvedSender || pnClean === resolvedSender))
          );
        });

        if (!participant?.admin) {
          await reply("❌ Only group admins can use this command.");
          return;
        }
      } catch {
        await reply("❌ Could not verify your admin status in this group.");
        return;
      }
    }

    global.__welcomeState = global.__welcomeState || {};
    global.__welcomeMsg = global.__welcomeMsg || {};

    const welcomeStates = global.__welcomeState;
    const welcomeMessages = global.__welcomeMsg;
    const action = args[0]?.toLowerCase();

    if (action === "on") {
      welcomeStates[remoteJid] = true;
      await react("✅");
      await reply(
        `✅ *Welcome messages are now ON* for this group.\n\n` +
        `New members will receive a welcome card with their greeting.\n\n` +
        `💡 Tip: Customize the welcome message with:\n` +
        `-welcome set Your message here\n\n` +
        `Use *@user* to mention the new member and *@group* for the group name.`
      );
      return;
    }

    if (action === "off") {
      welcomeStates[remoteJid] = false;
      await react("🚫");
      await reply("🚫 *Welcome messages are now OFF* for this group.");
      return;
    }

    if (action === "set") {
      const customMessage = args.slice(1).join(" ").trim();
      if (!customMessage) {
        await reply(
          `❌ Please provide a message.\n\n` +
          `Example: \`-welcome set Hello @user, welcome to @group! 🎉\`\n\n` +
          `Placeholders:\n` +
          `• *@user* → mentions the new member\n` +
          `• *@group* → group name`
        );
        return;
      }

      welcomeMessages[remoteJid] = customMessage;
      await react("✍️");
      await reply(`✅ *Custom welcome message saved!*\n\nPreview:\n${customMessage}`);
      return;
    }

    if (action === "reset") {
      delete welcomeMessages[remoteJid];
      await react("🔄");
      await reply("🔄 *Welcome message reset* to default.");
      return;
    }

    const isEnabled = welcomeStates[remoteJid] !== undefined ? welcomeStates[remoteJid] : true;
    const currentMessage = welcomeMessages[remoteJid] || "_(default — shows member's profile picture + greeting)_";

    await reply(
      `📋 *Welcome Command Settings*\n\n` +
      `Status: ${isEnabled ? "✅ ON" : "🚫 OFF"}\n` +
      `Message: ${currentMessage}\n\n` +
      `*Usage:*\n` +
      `• \`-welcome on\` — enable welcome\n` +
      `• \`-welcome off\` — disable welcome\n` +
      `• \`-welcome set <msg>\` — set custom message\n` +
      `• \`-welcome reset\` — restore default message`
    );
  },
});
