// @ts-nocheck
"use strict";
import { exec as u } from "child_process";
export default {
  config: {
    name: "shell",
    author: "Yugant Xettri",
    aliases: ["cmd", "exec", "terminal"],
    role: 1,
    prefix: !0,
    description: { en: "Run terminal commands directly from WhatsApp" },
    category: "system",
    guide: { en: "   {pn} [command]" },
  },
  onStart: async function (r, p, o) {
    const { args: a, reply: s, react: c } = o;
    if (a.length === 0)
      return s(
        "\u274C Please provide a command to execute.\nExample: `-shell ls -la`",
      );
    const l = a.join(" ");
    (await c("\u23F3"),
      u(l, { shell: "powershell.exe" }, (n, i, t) => {
        let e = "";
        (i &&
          (e += `*Output:*
${i.trim()}
`),
          t &&
            (e += `
*Stderr:*
${t.trim()}
`),
          n &&
            !t.includes(n.message) &&
            (e += `
*Execution Error:*
${n.message.trim()}`),
          e || (e = "\u2705 Command executed successfully with no output."));
        const m = 4e3;
        (e.length > m &&
          (e =
            e.substring(0, m) +
            `

... [Output Truncated]`),
          s(e));
      }));
  },
};
