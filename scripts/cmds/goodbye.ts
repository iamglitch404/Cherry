// @ts-nocheck
"use strict";

commandintro({
  name: "goodbye",
  author: "Yugant Xettri",
  aliases: ["setgoodbye", "leave", "setleave", "goodbyeset"],
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

    global.__goodbyeState = global.__goodbyeState || {};
    global.__goodbyeMsg = global.__goodbyeMsg || {};

    const goodbyeStates = global.__goodbyeState;
    const goodbyeMessages = global.__goodbyeMsg;
    const action = args[0]?.toLowerCase();

    if (action === "on") {
      goodbyeStates[remoteJid] = true;
      await react("✅");
      await reply(
        `✅ *Goodbye messages are now ON* for this group.\n\n` +
        `When a member leaves, the group will be notified.\n\n` +
        `💡 Tip: Set a custom message with:\n` +
        `-goodbye set Your message here\n\n` +
        `Use *@user* to mention the member and *@group* for the group name.`
      );
      return;
    }

    if (action === "off") {
      goodbyeStates[remoteJid] = false;
      await react("🚫");
      await reply("🚫 *Goodbye messages are now OFF* for this group.");
      return;
    }

    if (action === "set") {
      const customMessage = args.slice(1).join(" ").trim();
      if (!customMessage) {
        await reply(
          `❌ Please provide a message.\n\n` +
          `Example: \`-goodbye set We'll miss you @user! 💙\`\n\n` +
          `Placeholders:\n` +
          `• *@user* → mentions the leaving member\n` +
          `• *@group* → group name`
        );
        return;
      }

      goodbyeMessages[remoteJid] = customMessage;
      await react("✍️");
      await reply(`✅ *Custom goodbye message saved!*\n\nPreview:\n${customMessage}`);
      return;
    }

    if (action === "reset") {
      delete goodbyeMessages[remoteJid];
      await react("🔄");
      await reply("🔄 *Goodbye message reset* to default.");
      return;
    }

    const isEnabled = goodbyeStates[remoteJid] !== undefined ? goodbyeStates[remoteJid] : false;
    const currentMessage = goodbyeMessages[remoteJid] || "_(default — farewell text with member mention)_";

    await reply(
      `📋 *Goodbye / Leave Command Settings*\n\n` +
      `Status: ${isEnabled ? "✅ ON" : "🚫 OFF"}\n` +
      `Message: ${currentMessage}\n\n` +
      `*Usage:*\n` +
      `• \`-goodbye on\` — enable goodbye\n` +
      `• \`-goodbye off\` — disable goodbye\n` +
      `• \`-goodbye set <msg>\` — set custom message\n` +
      `• \`-goodbye reset\` — restore default message\n\n` +
      `_Aliases: leave, setleave, setgoodbye_`
    );
  },
});
