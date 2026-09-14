// @ts-nocheck
"use strict";

import { exec } from "child_process";

commandintro({
  name: "shell",
  author: "Yugant Xettri",
  aliases: ["cmd", "exec", "terminal"],
  role: 2,
  onStart: async (sock, msg, { args, reply, react, senderJid }) => {
    if (!global.isAdmin(senderJid)) {
      return reply("❌ Only configured bot admins can execute shell commands.");
    }

    if (args.length === 0) {
      return reply("❌ Please provide a command to execute.\n\nExample: `-shell ls -la`");
    }

    const command = args.join(" ");
    const shellEnv = process.platform === "win32" ? "powershell.exe" : (process.env.SHELL || "/bin/sh");

    await react("⏳");

    exec(command, { shell: shellEnv, maxBuffer: 1024 * 1024, timeout: 15000 }, async (error, stdout, stderr) => {
      let outputText = "";

      if (stdout) {
        outputText += `*Output:*\n${stdout.trim()}\n`;
      }

      if (stderr) {
        outputText += `\n*Stderr:*\n${stderr.trim()}\n`;
      }

      if (error && !stderr.includes(error.message)) {
        outputText += `\n*Execution Error:*\n${error.message.trim()}\n`;
      }

      if (!outputText.trim()) {
        outputText = "✅ Command executed successfully with no output.";
      }

      const maxLength = 4000;
      if (outputText.length > maxLength) {
        outputText = outputText.substring(0, maxLength) + "\n\n... [Output Truncated]";
      }

      await reply(outputText);
    });
  },
});
