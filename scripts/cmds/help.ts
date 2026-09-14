// @ts-nocheck
"use strict";

commandintro({
  name: "help",
  author: "Yugant Xettri",
  aliases: ["h", "menu", "cmds"],
  role: 0,
  onStart: async (sock, msg, { reply }) => {
    const prefix = global.getBotConfig().prefix || "!";
    const uniqueCommands = Array.from(new Set(global.commands.values()));

    const list = uniqueCommands
      .map((cmd) => {
        const aliasText = cmd.aliases?.length ? ` (aliases: ${cmd.aliases.join(", ")})` : "";
        return `• *${prefix}${cmd.name}*${aliasText}`;
      })
      .join("\n");

    await reply(
      `📋 *Available Commands:*\n\n${list}\n\n` +
      `🍒 *Cherry Bot* — Made by Yugant Xettri`
    );
  },
});
