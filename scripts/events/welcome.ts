// @ts-nocheck
"use strict";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

global.__welcomeState = global.__welcomeState || {};
global.__goodbyeState = global.__goodbyeState || {};
global.__welcomeMsg = global.__welcomeMsg || {};
global.__goodbyeMsg = global.__goodbyeMsg || {};

async function sendGroupNotification(sock, groupJid, memberJid, groupName, type) {
  const memberNumber = memberJid.split("@")[0];
  const isWelcome = type === "welcome";

  const defaultWelcome =
    `✨ *Welcome, @${memberNumber}!* 🎉☕\n\n` +
    `Welcome to *${groupName}* — where tech meets good vibes.\n\n` +
    `🧸 Feel free to introduce yourself whenever you're ready.\n` +
    `🚀 We're happy to have you here!\n\n` +
    `*Happy chatting!* 🛠️`;

  const defaultGoodbye =
    `👋 *@${memberNumber}* has left *${groupName}*.\n` +
    `We'll miss you! Take care 💙`;

  const customTemplate = isWelcome
    ? global.__welcomeMsg[groupJid]
    : global.__goodbyeMsg[groupJid];

  const messageText = customTemplate
    ? customTemplate.replace(/@user/gi, `@${memberNumber}`).replace(/@group/gi, groupName)
    : isWelcome
    ? defaultWelcome
    : defaultGoodbye;

  if (isWelcome) {
    try {
      const cardPath = path.resolve(__dirname, "../cmds/assets/welcome.jpg");
      if (fs.existsSync(cardPath)) {
        const imageBuffer = fs.readFileSync(cardPath);
        await sock.sendMessage(groupJid, {
          image: imageBuffer,
          caption: messageText,
          mentions: [memberJid],
        });
        return;
      }
    } catch {}

    await sock.sendMessage(groupJid, {
      text: messageText,
      mentions: [memberJid],
    });
  } else {
    const goodbyeBanner =
      `╔══════════════════╗\n` +
      `║   👋  G O O D B Y E   ║\n` +
      `╚══════════════════╝\n\n` +
      `${messageText}`;

    await sock.sendMessage(groupJid, {
      text: goodbyeBanner,
      mentions: [memberJid],
    });
  }
}

createEvent({
  eventName: "group-participants.update",
  execute: async (sock, update) => {
    const { id: groupJid, participants, action } = update;
    if (!groupJid || !participants || !action) return;

    let groupName = groupJid;
    try {
      const metadata = await sock.groupMetadata(groupJid);
      if (metadata?.subject) {
        groupName = metadata.subject;
      }
    } catch {}

    for (const participant of participants) {
      const participantJid = typeof participant === "string" ? participant : participant?.id || String(participant);
      if (!participantJid || typeof participantJid.split !== "function") continue;

      if (action === "add") {
        const isWelcomeEnabled =
          global.__welcomeState[groupJid] !== undefined ? global.__welcomeState[groupJid] : true;
        if (!isWelcomeEnabled) continue;

        console.log(`[Welcome] Member joined: ${participantJid.split("@")[0]} in ${groupJid}`);
        await sendGroupNotification(sock, groupJid, participantJid, groupName, "welcome");
      } else if (action === "remove") {
        const isGoodbyeEnabled =
          global.__goodbyeState[groupJid] !== undefined ? global.__goodbyeState[groupJid] : false;
        if (!isGoodbyeEnabled) continue;

        console.log(`[Goodbye] Member left: ${participantJid.split("@")[0]} in ${groupJid}`);
        await sendGroupNotification(sock, groupJid, participantJid, groupName, "goodbye");
      }
    }
  },
});
