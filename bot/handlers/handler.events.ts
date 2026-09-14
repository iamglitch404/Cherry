// @ts-nocheck
"use strict";

const cooldowns = new Map();

export default function createEventRouter(sock, message, context) {
    const { senderNumber, senderJid, remoteJid } = context;
    const botConfig = global.getBotConfig();

    return {
        onReaction: async () => {
            const reactionMsg = message.message?.reactionMessage;
            if (!reactionMsg) return;
            const emoji = reactionMsg.text;
            const targetKey = reactionMsg.key;
            
            for (const cmd of global.commands.values()) {
                if (typeof cmd.onReaction === "function") {
                    Promise.resolve(cmd.onReaction(sock, message, { ...context, emoji, targetKey }))
                           .catch(err => console.error(global.lang.command.errorReaction(cmd.name), err));
                }
            }
        },

        onEdit: async () => {
            const protocolMsg = message.message?.protocolMessage;
            if (!(protocolMsg && (protocolMsg.type === "MESSAGE_EDIT" || protocolMsg.type === 14 || protocolMsg.editedMessage))) return;
            
            const editedText = protocolMsg.editedMessage?.conversation || protocolMsg.editedMessage?.extendedTextMessage?.text || "";
            const targetKey = protocolMsg.key;
            
            for (const cmd of global.commands.values()) {
                if (typeof cmd.onEdit === "function") {
                    Promise.resolve(cmd.onEdit(sock, message, { ...context, editedText, targetKey }))
                           .catch(err => console.error(global.lang.command.errorEdit(cmd.name), err));
                }
            }
        },

        onChat: async () => {
            for (const cmd of global.commands.values()) {
                if (typeof cmd.onChat === "function") {
                    Promise.resolve(cmd.onChat(sock, message, context))
                           .catch(err => console.error(global.lang.command.errorChat(cmd.name), err));
                }
            }
        },

        onReply: async () => {
            if (context.quotedMsg) {
                for (const cmd of global.commands.values()) {
                    if (typeof cmd.onReply === "function") {
                        Promise.resolve(cmd.onReply(sock, message, context))
                               .catch(err => console.error(global.lang.command.errorReply(cmd.name), err));
                    }
                }
            }
        },

        onStart: async () => {
            const prefix = botConfig.prefix;
            const text = context.senderText || "";
            
            if (text.trim() === prefix) {
                const prefixMsg = (global as any).lang?.command?.prefixOnly(prefix);
                await context.reply(prefixMsg);
                return;
            }

            let commandToExecute = null;
            let args = [];
            const hasPrefix = text.startsWith(prefix);
            const tokens = text.trim().split(/\s+/);
            const firstToken = tokens[0].toLowerCase();
            let parsedCommandName = "";

            if (hasPrefix) {
                const afterPrefix = text.slice(prefix.length).trim().split(/\s+/);
                parsedCommandName = afterPrefix[0].toLowerCase();
                args = afterPrefix.slice(1);
                
                for (const cmd of global.commands.values()) {
                    if (cmd.prefix !== false && (cmd.name.toLowerCase() === parsedCommandName || (cmd.aliases && cmd.aliases.some(a => a.toLowerCase() === parsedCommandName)))) {
                        commandToExecute = cmd;
                        break;
                    }
                }

                if (!commandToExecute && parsedCommandName.length > 0) {
                    const invalidMsg = (global as any).lang?.command?.noExists(parsedCommandName, prefix);
                    await context.reply(invalidMsg);
                    return;
                }
            }

            if (!commandToExecute) {
                parsedCommandName = firstToken;
                args = tokens.slice(1);
                for (const cmd of global.commands.values()) {
                    if (cmd.prefix === false && (cmd.name.toLowerCase() === parsedCommandName || (cmd.aliases && cmd.aliases.some(a => a.toLowerCase() === parsedCommandName)))) {
                        commandToExecute = cmd;
                        break;
                    }
                }
            }

            if (commandToExecute) {
                const executionContext = { ...context, args };
                const role = commandToExecute.role ?? 0;
                
                if (role > 0) {
                    const isBotAdmin = global.isAdmin(senderJid) || global.isAdmin(context.senderNumber);
                    
                    // role 2: Bot Admin Only
                    if (role >= 2 && !isBotAdmin) {
                        await context.reply(global.lang.command.adminOnly());
                        return;
                    }

                    // role 1: Group Admin (or Bot Admin) in group
                    if (role === 1) {
                        if (!remoteJid.endsWith("@g.us")) {
                            await context.reply(global.lang.command.groupOnly());
                            return;
                        }
                        if (!isBotAdmin) {
                            try {
                                const metadata = await sock.groupMetadata(remoteJid);
                                if (metadata?.participants) {
                                    for (const p of metadata.participants) {
                                        if (p.id && p.phoneNumber) {
                                            const lidClean = (p.id || "").split('@')[0].split(':')[0].replace(/\D/g, '');
                                            const pnClean = (p.phoneNumber || "").split('@')[0].split(':')[0].replace(/\D/g, '');
                                            if (lidClean && pnClean && global.lidToPnCache) {
                                                global.lidToPnCache.set(lidClean, pnClean);
                                            }
                                        }
                                    }
                                }
                                const cleanSender = (senderJid || "").split('@')[0].split(':')[0].replace(/\D/g, '');
                                const resolvedSender = context.senderNumber || (global.resolvePhoneNumber ? global.resolvePhoneNumber(senderJid) : cleanSender);

                                const participant = metadata.participants.find(p => {
                                    const pIdClean = (p.id || "").split('@')[0].split(':')[0].replace(/\D/g, '');
                                    const pPnClean = (p.phoneNumber || "").split('@')[0].split(':')[0].replace(/\D/g, '');
                                    return p.id === senderJid ||
                                           pIdClean === cleanSender ||
                                           (resolvedSender && (pIdClean === resolvedSender || pPnClean === resolvedSender));
                                });
                                if (!(participant && (participant.admin === "admin" || participant.admin === "superadmin"))) {
                                    await context.reply(global.lang.command.groupAdminOnly());
                                    return;
                                }
                            } catch (err) {
                                console.error(global.lang.command.fetchMetaError(), err);
                                await context.reply(global.lang.command.verifyPermsFailed());
                                return;
                            }
                        }
                    }
                }

                const delay = commandToExecute.countDown || 0;
                const isBotAdmin = global.isAdmin(senderJid) || global.isAdmin(context.senderNumber);
                if (delay > 0 && !isBotAdmin) {
                    const cmdName = commandToExecute.name;
                    if (!cooldowns.has(cmdName)) cooldowns.set(cmdName, new Map());
                    const usersMap = cooldowns.get(cmdName);
                    
                    const lastUsed = usersMap.get(senderJid) || 0;
                    const now = Date.now();
                    const timeLeft = lastUsed + (delay * 1000) - now;
                    
                    if (timeLeft > 0) {
                        const secondsLeft = Math.ceil(timeLeft / 1000);
                        await context.reply(global.lang.command.cooldown(secondsLeft));
                        return;
                    }
                    usersMap.set(senderJid, now);
                }

                try {
                    if (typeof commandToExecute.onStart === "function") {
                        await commandToExecute.onStart(sock, message, executionContext);
                    } else if (typeof commandToExecute.execute === "function") {
                        await commandToExecute.execute(sock, message, executionContext);
                    }
                } catch (err) {
                    console.error(global.lang.command.errorExecute(commandToExecute.name), err);
                }
            }
        }
    };
}
