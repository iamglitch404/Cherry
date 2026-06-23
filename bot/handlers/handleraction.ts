// @ts-nocheck
"use strict";
import createEventRouter from "./handler.events.ts";
import moment from "moment-timezone";
import fs from "fs";
import path from "path";

function cleanNumber(jid) {
    return jid.replace(/\D/g, "");
}

export function createHandlerAction(sock, sentMessageIds) {
    return async function(event) {
        if (event.type !== "notify") return;
        const config = global.getBotConfig();
        const msg = event.messages[0];
        
        if (!msg || (msg.key.id && sentMessageIds.has(msg.key.id))) return;
        const remoteJid = msg.key.remoteJid;
        if (!remoteJid) return;
        
        const participant = msg.key.participant || msg.participant || remoteJid;
        const senderNumber = cleanNumber(participant);
        
        if (!global.isAdmin(participant)) {
            const isNewsletter = remoteJid.endsWith("@newsletter");
            const isGroup = remoteJid.endsWith("@g.us");
            
            const wMode = config.whiteListMode.enable;
            const wGroup = config.whiteListGroup.enable;
            const wChannel = config.whiteListChannel.enable;
            
            if (isNewsletter && (!wChannel || !config.whiteListChannel.whiteListChannelIds.includes(remoteJid))) return;
            if (!isGroup && !isNewsletter && wGroup) return;
            
            if (!isNewsletter) {
                if (wMode && wGroup) {
                    const isWUser = config.whiteListMode.whiteListIds.includes(senderNumber);
                    const isWThread = config.whiteListGroup.whiteListThreadIds.includes(remoteJid);
                    if (!isWUser && !isWThread) return;
                } else if ((wMode && !config.whiteListMode.whiteListIds.includes(senderNumber)) || 
                           (wGroup && !config.whiteListGroup.whiteListThreadIds.includes(remoteJid))) {
                    return;
                }
            }
        }
        
        const reply = async (content, options = {}) => {
            const msgContent = typeof content === "string" ? { text: content } : content;
            const sent = await sock.sendMessage(remoteJid, { ...msgContent }, { quoted: msg, ...options });
            const tz = config.timeZone || "Asia/Kathmandu";
            console.log(`  \x1B[90m${moment().tz(tz).format("DD/MM/YY HH:mm:ss")}\x1B[0m  \x1B[90m${global.lang.action.replySent(remoteJid)}\x1B[0m`);
            if (sent?.key?.id) {
                sentMessageIds.add(sent.key.id);
                sent.edit = async (newText) => await edit(newText, sent.key);
            }
            return sent;
        };
        
        const react = async (emoji, targetKey = msg.key) => {
            const sent = await sock.sendMessage(remoteJid, { react: { text: emoji, key: targetKey } });
            const tz = config.timeZone || "Asia/Kathmandu";
            console.log(`  \x1B[90m${moment().tz(tz).format("DD/MM/YY HH:mm:ss")}\x1B[0m  \x1B[90m${global.lang.action.reacted(emoji, remoteJid)}\x1B[0m`);
            if (sent?.key?.id) sentMessageIds.add(sent.key.id);
            return sent;
        };
        
        const edit = async (newText, targetKey) => {
            const sent = await sock.sendMessage(remoteJid, { text: newText, edit: targetKey });
            const tz = config.timeZone || "Asia/Kathmandu";
            console.log(`  \x1B[90m${moment().tz(tz).format("DD/MM/YY HH:mm:ss")}\x1B[0m  \x1B[90m${global.lang.action.edited(remoteJid)}\x1B[0m`);
            if (sent?.key?.id) sentMessageIds.add(sent.key.id);
            return sent;
        };
        
        const textContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text || 
                            msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || 
                            msg.message?.documentMessage?.caption || "";
                            
        if (textContent.toLowerCase() === global.lang.message.pong().toLowerCase()) return;
        
        if (textContent) {
            const tz = config.timeZone || "Asia/Kathmandu";
            const timestamp = moment().tz(tz).format("DD/MM/YY HH:mm:ss");
            const msgType = Object.keys(msg.message || {})[0] || "unknown";
            
            console.log(`  \x1B[90m${timestamp}\x1B[0m  \x1B[90m${global.lang.action.received(msgType, senderNumber)}\x1B[0m`);
            console.log(`  \x1B[90m${JSON.stringify(msg, null, 2).split('\\n').join('\\n  ')}\x1B[0m`);
            
            try {
                if (global.db.messageModel) {
                    global.db.messageModel.create({
                        messageID: msg.key.id,
                        senderID: senderNumber,
                        threadID: remoteJid,
                        timestamp: timestamp,
                        messageData: msg
                    }).catch(() => {});
                }
            } catch (e) {}
        }
        
        const contextInfo = msg.message?.extendedTextMessage?.contextInfo || msg.message?.imageMessage?.contextInfo || 
                            msg.message?.videoMessage?.contextInfo || msg.message?.documentMessage?.contextInfo;
                            
        const hasQuotedMsg = !!contextInfo?.quotedMessage;
        const quotedMsg = contextInfo?.quotedMessage;
        const quotedKey = hasQuotedMsg ? {
            remoteJid: remoteJid,
            fromMe: contextInfo.participant === sock.user?.id,
            id: contextInfo.stanzaId,
            participant: contextInfo.participant || remoteJid
        } : undefined;
        
        const context = {
            senderNumber: senderNumber,
            senderJid: participant,
            remoteJid: remoteJid,
            senderText: textContent,
            reply: reply,
            react: react,
            edit: edit,
            quotedMsg: quotedMsg,
            quotedKey: quotedKey
        };
        
        const router = createEventRouter(sock, msg, context);
        const reactionMessage = msg.message?.reactionMessage;
        const protocolMessage = msg.message?.protocolMessage;
        const isEdit = protocolMessage && (protocolMessage.type === "MESSAGE_EDIT" || protocolMessage.type === 14 || protocolMessage.editedMessage);
        
        if (reactionMessage) {
            await router.onReaction();
        } else if (isEdit) {
            await router.onEdit();
        } else {
            await router.onChat();
            await router.onReply();
            await router.onStart();
        }
    };
}
