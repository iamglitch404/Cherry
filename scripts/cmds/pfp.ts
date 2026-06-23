// @ts-nocheck
"use strict";
const timeout = (a) =>
    new Promise((r, s) => setTimeout(() => s(new Error("Timeout")), a)),
  queryProfilePictureUrl = async (a, r, s) => {
    const p = r.split("@")[1] || "s.whatsapp.net",
      u = a.query({
        tag: "iq",
        attrs: { target: r, to: p, type: "get", xmlns: "w:profile:picture" },
        content: [{ tag: "picture", attrs: { type: s, query: "url" } }],
      }),
      f = await Promise.race([u, timeout(5e3)]);
    return (
      (Array.isArray(f.content)
        ? f.content.find((i) => i.tag === "picture")
        : null
      )?.attrs?.url || null
    );
  };
createCommand({
  name: "pfp",
  author: "Yugant Xettri",
  aliases: ["profile", "avatar"],
  prefix: !0,
  onStart: async (a, r, { args: s, senderJid: p, remoteJid: u, reply: f }) => {
    let e = p;
    const i =
      r.message?.extendedTextMessage?.contextInfo ||
      r.message?.imageMessage?.contextInfo ||
      r.message?.videoMessage?.contextInfo ||
      r.message?.documentMessage?.contextInfo;
    i?.quotedMessage && (e = i.participant || i.quotedMessage.participant || p);
    const g = i?.mentionedJid && i.mentionedJid.length > 0;
    if ((g && (e = i.mentionedJid[0]), !g && s && s.length > 0)) {
      const t = s.join(" "),
        c = t.replace(/\D/g, "");
      c.length >= 7 &&
        (t.includes("lid") ? (e = `${c}@lid`) : (e = `${c}@s.whatsapp.net`));
    }
    console.log(`[Command] pfp initiated by ${p.split("@")[0]} targeting ${e}`);
    try {
      let t = null;
      const c = async (l) => {
        try {
          console.log(
            `[PFP] Fetching high-res image for ${l.split("@")[0]}...`,
          );
          const n = await queryProfilePictureUrl(a, l, "image");
          if (n) return n;
          throw new Error("No URL in response");
        } catch (n) {
          console.log(
            `[PFP] High-res failed for ${l.split("@")[0]}: ${n.message || n}. Trying preview...`,
          );
          try {
            const o = await queryProfilePictureUrl(a, l, "preview");
            if (o) return o;
          } catch {}
          console.log(
            "[PFP] Manual IQ failed, trying native profilePictureUrl...",
          );
          try {
            const o = await a.profilePictureUrl(l, "image");
            if (o) return o;
          } catch {}
          throw new Error("No URL returned from any method");
        }
      };
      try {
        t = await c(e);
      } catch (l) {
        if (e.endsWith("@s.whatsapp.net")) {
          const n = e.replace("@s.whatsapp.net", "@lid");
          console.log(
            `[PFP] Failed for standard JID, trying LID fallback: ${n}`,
          );
          try {
            ((t = await c(n)), (e = n));
          } catch (o) {
            throw o;
          }
        } else throw l;
      }
      if (!t)
        throw new Error("No profile picture URL returned after all attempts");
      (await a.sendMessage(
        u,
        {
          image: { url: t },
          caption: `Profile picture of @${e.split("@")[0]}`,
        },
        { quoted: r, mentions: [e] },
      ),
        console.log(
          `[Command] Successfully sent profile picture of ${e.split("@")[0]} to ${u}`,
        ));
    } catch (t) {
      (console.error(
        `[Command] Failed to retrieve profile picture for ${e.split("@")[0]}:`,
        t.message || t,
      ),
        await f(
          `Failed to retrieve profile picture for @${e.split("@")[0]}. The user may not have a profile picture set, or their privacy settings prevent viewing it.`,
          { mentions: [e] },
        ),
        console.log(`[Command] Sent fallback error reply to ${u}`));
    }
  },
});
