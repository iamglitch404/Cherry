// @ts-nocheck
"use strict";
const welcomeState = global.__welcomeState || {},
  goodbyeState = global.__goodbyeState || {},
  welcomeMsg = global.__welcomeMsg || {},
  goodbyeMsg = global.__goodbyeMsg || {};
((global.__welcomeState = welcomeState),
  (global.__goodbyeState = goodbyeState),
  (global.__welcomeMsg = welcomeMsg),
  (global.__goodbyeMsg = goodbyeMsg));
async function sendGroupCard(o, a, e, l, c) {
  const s = e.split("@")[0],
    n = c === "welcome",
    t = n
      ? `\u2728 *Yay, you made it, @${s}!* \u{1F389}\u2615\uFE0F

Welcome to our little corner of the internet \u2014 where tech meets good vibes.

\u{1F9F8} No pressure here. Just chill, code & coffee.
\u{1F4AC} Introduce yourself whenever you feel ready.
\u{1F680} We're really happy to have you!

*Happy building!* \u{1F6E0}\uFE0F`
      : `\u{1F44B} *@${s}* has left *${l}*.
We'll miss you! Take care \u{1F499}`,
    i = n ? welcomeMsg[a] : goodbyeMsg[a],
    g = i ? i.replace(/@user/gi, `@${s}`).replace(/@group/gi, l) : t;
  if (n)
    try {
      const r = global.path.resolve(
          global.path.dirname(global.fileURLToPath(import.meta.url)),
          "../cmds/assets/welcome.jpg",
        ),
        d = global.fs.readFileSync(r);
      await o.sendMessage(a, { image: d, caption: g, mentions: [e] });
    } catch {
      await o.sendMessage(a, { text: g, mentions: [e] });
    }
  else
    await o.sendMessage(a, {
      text: `\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551  \u{1F44B}  G O O D B Y E  \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

${g}`,
      mentions: [e],
    });
}
createEvent({
  eventName: "group-participants.update",
  execute: async (o, a) => {
    const { id: e, participants: l, action: c } = a;
    if (!e || !l || !c) return;
    let s = e;
    try {
      s = (await o.groupMetadata(e))?.subject || e;
    } catch {}
    for (const n of l) {
      const t = typeof n == "string" ? n : n?.id || String(n);
      if (!(!t || typeof t.split != "function")) {
        if (c === "add") {
          if (!(welcomeState[e] !== void 0 ? welcomeState[e] : !0)) continue;
          (console.log(`[Event] Sending welcome to ${t.split("@")[0]} in ${e}`),
            await sendGroupCard(o, e, t, s, "welcome"));
        } else if (c === "remove") {
          if (!(goodbyeState[e] !== void 0 ? goodbyeState[e] : !1)) continue;
          (console.log(`[Event] Sending goodbye to ${t.split("@")[0]} in ${e}`),
            await sendGroupCard(o, e, t, s, "goodbye"));
        }
      }
    }
  },
});
