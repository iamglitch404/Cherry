// @ts-nocheck
"use strict";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { downloadMediaMessage } from "@whiskeysockets/baileys";

global.geminiChatHistory = global.geminiChatHistory || new Map();
global.geminiSentMessageIds = global.geminiSentMessageIds || new Map();

const chatHistory = global.geminiChatHistory;
const sentMessageIds = global.geminiSentMessageIds;

function getApiKey() {
  return process.env.GEMINI_API_KEY || global.getBotConfig?.().geminiApiKey || "";
}

async function handleGemini(sock, msg, context, customPrompt) {
  const { reply, react, args, remoteJid, quotedMsg, senderJid } = context;
  const apiKey = getApiKey();

  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    await reply(
      "❌ Gemini API key is not configured. Set GEMINI_API_KEY in environment or geminiApiKey in config.json.\n\nGet a free key at: https://aistudio.google.com/app/apikey"
    );
    return;
  }

  // Detect any media (direct or quoted)
  let mediaType = null;
  let mediaMessage = null;
  let isDirectMedia = false;

  if (msg.message?.imageMessage) {
    mediaType = "image";
    mediaMessage = msg.message.imageMessage;
    isDirectMedia = true;
  } else if (quotedMsg?.imageMessage) {
    mediaType = "image";
    mediaMessage = quotedMsg.imageMessage;
  } else if (msg.message?.documentMessage) {
    mediaType = "document";
    mediaMessage = msg.message.documentMessage;
    isDirectMedia = true;
  } else if (quotedMsg?.documentMessage) {
    mediaType = "document";
    mediaMessage = quotedMsg.documentMessage;
  } else if (msg.message?.videoMessage) {
    mediaType = "video";
    mediaMessage = msg.message.videoMessage;
    isDirectMedia = true;
  } else if (quotedMsg?.videoMessage) {
    mediaType = "video";
    mediaMessage = quotedMsg.videoMessage;
  } else if (msg.message?.audioMessage) {
    mediaType = "audio";
    mediaMessage = msg.message.audioMessage;
    isDirectMedia = true;
  } else if (quotedMsg?.audioMessage) {
    mediaType = "audio";
    mediaMessage = quotedMsg.audioMessage;
  }

  let prompt = customPrompt !== undefined ? customPrompt : args.join(" ").trim();

  // If caption is present with media
  if (!prompt && isDirectMedia && mediaMessage?.caption) {
    const config = global.getBotConfig();
    const caption = mediaMessage.caption || "";
    const cleaned = caption.startsWith(config.prefix) ? caption.slice(config.prefix.length).trim() : caption;
    prompt = cleaned.split(/\s+/).slice(1).join(" ").trim();
  }

  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt === "reset" || lowerPrompt === "clear") {
    chatHistory.delete(remoteJid);
    await reply("🧹 Gemini chat memory has been cleared for this chat.");
    return;
  }

  if (!mediaMessage && !prompt) {
    await reply(
      "💡 *Gemini Usage:*\n" +
      "• *-gemini <question>*\n" +
      "• Reply to an image/video/doc/audio with *-gemini <question>*\n" +
      "• Use *-gemini reset* to clear conversation memory."
    );
    return;
  }

  await react("🤖");

  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction:
        "You are a helpful and fun conversational AI. You MUST respond ONLY in casual Romanized Nepali (Nepenglish), meaning Nepali language written in the English alphabet. Keep your answers short, friendly, and natural like a text message.",
    });

    const history = chatHistory.get(remoteJid) || [];
    const contents = [];

    if (mediaMessage) {
      const mediaSource = isDirectMedia ? msg : { key: msg.key, message: { [`${mediaType}Message`]: mediaMessage } };
      const mediaBuffer = await downloadMediaMessage(mediaSource, "buffer", {});
      const mimeType = mediaMessage.mimetype || (
        mediaType === "image" ? "image/jpeg" :
        mediaType === "video" ? "video/mp4" :
        mediaType === "audio" ? "audio/mp4" :
        "application/octet-stream"
      );

      let docHeader = "";
      if (mediaType === "document" && mediaMessage.fileName) {
        docHeader = `[Attached File: ${mediaMessage.fileName}]\n`;
      }

      contents.push({ text: docHeader + (prompt || `Describe or analyze this ${mediaType}.`) });
      contents.push({ inlineData: { data: mediaBuffer.toString("base64"), mimeType } });
    } else {
      contents.push({ text: prompt });
    }

    const chat = model.startChat({ history });
    let response;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await chat.sendMessage(contents);
        break;
      } catch (err) {
        if ((err?.message?.includes("503") || err?.status === 503) && attempt < maxRetries) {
          console.log(`[Gemini] 503 on attempt ${attempt}, retrying in 3s...`);
          await new Promise((r) => setTimeout(r, 3000));
        } else {
          throw err;
        }
      }
    }

    let answer = response.response.text().trim();
    answer = answer.replace(/\*\*/g, "*");

    const sent = await reply(answer || "🤔 No response received from Gemini.");
    if (sent?.key?.id) {
      sentMessageIds.set(sent.key.id, senderJid);
    }

    // Keep the last 20 messages of context
    let updatedHistory = await chat.getHistory();
    if (updatedHistory.length > 20) {
      updatedHistory = updatedHistory.slice(-20);
      if (updatedHistory[0]?.role === "model") updatedHistory.shift();
    }
    chatHistory.set(remoteJid, updatedHistory);
  } catch (err) {
    console.error("[Gemini] Error:", err);
    if (!err?.message?.includes("503") && err?.status !== 503) {
      await reply(`❌ Gemini error: ${err?.message || String(err)}`);
    }
  }
}

commandintro({
  name: "gemini",
  author: "Yugant Xettri",
  aliases: ["ai", "ask"],
  role: 0,
  onStart: async (sock, msg, context) => {
    await handleGemini(sock, msg, context);
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
        await handleGemini(sock, msg, context, text.trim());
      }
    }
  },
});
