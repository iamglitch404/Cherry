// @ts-nocheck
"use strict";

import { downloadMediaMessage } from "@whiskeysockets/baileys";

global.mistralChatHistory = global.mistralChatHistory || new Map();
global.mistralSentMessageIds = global.mistralSentMessageIds || new Map();

const chatHistory = global.mistralChatHistory;
const sentMessageIds = global.mistralSentMessageIds;

function getApiKey() {
  return process.env.MISTRAL_API_KEY || global.getBotConfig?.().mistralApiKey || "";
}

async function handleMistral(sock, msg, context, customPrompt) {
  const { reply, react, args, quotedMsg, remoteJid, senderJid } = context;
  const apiKey = getApiKey();

  if (!apiKey) {
    await reply("❌ Mistral API key is not configured. Set MISTRAL_API_KEY in environment or mistralApiKey in config.json.");
    return;
  }

  let imageMsg = null;
  let isDirectImage = false;

  if (msg.message?.imageMessage) {
    imageMsg = msg.message.imageMessage;
    isDirectImage = true;
  } else if (quotedMsg?.imageMessage) {
    imageMsg = quotedMsg.imageMessage;
  }

  let prompt = customPrompt !== undefined ? customPrompt : args.join(" ").trim();
  if (!prompt && isDirectImage && imageMsg?.caption) {
    prompt = (imageMsg.caption || "").split(/\s+/).slice(1).join(" ").trim();
  }

  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt === "reset" || lowerPrompt === "clear") {
    chatHistory.delete(remoteJid);
    await reply("🧹 Mistral chat memory has been cleared for this chat.");
    return;
  }

  if (!prompt && !imageMsg) {
    await reply(
      "💡 *Mistral AI Usage:*\n" +
      "• *-ai <your question>*\n" +
      "• Reply to an image with *-ai <question>*\n" +
      "• Use *-ai reset* to clear memory."
    );
    return;
  }

  await react("🤖");

  try {
    let contentPayload = prompt || "Describe this image.";
    const model = imageMsg ? "pixtral-12b-2409" : "mistral-large-latest";

    if (imageMsg) {
      const mediaSource = isDirectImage ? msg : { key: msg.key, message: { imageMessage: imageMsg } };
      const imageBuffer = await downloadMediaMessage(mediaSource, "buffer", {});
      const mimeType = imageMsg.mimetype || "image/jpeg";
      const base64Data = imageBuffer.toString("base64");

      contentPayload = [
        { type: "text", text: prompt || "Describe this image." },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } },
      ];
    }

    const history = chatHistory.get(remoteJid) || [];
    const messages = [
      {
        role: "system",
        content:
          "You are a helpful and fun conversational AI. You MUST respond ONLY in casual Romanized Nepali (Nepenglish), meaning Nepali language written in the English alphabet. Keep your answers short, friendly, and natural like a text message. Format any bold text using single asterisks like *this*.",
      },
      ...history,
      { role: "user", content: contentPayload },
    ];

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("[Mistral] API Error:", errData);
      throw new Error(`API Error ${response.status}: ${errData.message || "Unknown error"}`);
    }

    const data = await response.json();
    let replyText = data.choices?.[0]?.message?.content?.trim();

    if (replyText) {
      replyText = replyText.replace(/\*\*/g, "*");
      const sent = await reply(replyText);
      if (sent?.key?.id) {
        sentMessageIds.set(sent.key.id, senderJid);
      }

      history.push({ role: "user", content: typeof contentPayload === "string" ? contentPayload : prompt });
      history.push({ role: "assistant", content: replyText });

      if (history.length > 16) {
        history.splice(0, history.length - 16);
      }
      chatHistory.set(remoteJid, history);
      await react("✅");
    } else {
      await reply("🤔 Mistral did not return a response.");
      await react("❌");
    }
  } catch (err) {
    console.error("[Mistral] Error:", err);
    await reply(`❌ Mistral Error: ${err.message}`);
    await react("❌");
  }
}

commandintro({
  name: "ai",
  author: "Yugant Xettri",
  role: 0,
  onStart: async (sock, msg, context) => {
    const stanzaId = (
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo ||
      msg.message?.documentMessage?.contextInfo
    )?.stanzaId;

    if (!stanzaId || !sentMessageIds.has(stanzaId)) {
      await handleMistral(sock, msg, context);
    }
  },
  onReply: async (sock, msg, context) => {
    const { senderJid } = context;
    const stanzaId = (
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo ||
      msg.message?.documentMessage?.contextInfo
    )?.stanzaId;

    const originalSender = stanzaId ? sentMessageIds.get(stanzaId) : null;
    if (stanzaId && originalSender) {
      if (senderJid !== originalSender) return;
      const config = global.getBotConfig();
      const text = context.senderText || "";
      if (!text.startsWith(config.prefix)) {
        let cleanText = text.trim();
        if (cleanText.toLowerCase().startsWith("ai ")) {
          cleanText = cleanText.substring(3).trim();
        } else if (cleanText.toLowerCase() === "ai") {
          cleanText = "";
        }
        await handleMistral(sock, msg, context, cleanText);
      }
    }
  },
});
