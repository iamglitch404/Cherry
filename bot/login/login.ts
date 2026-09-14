// @ts-nocheck
"use strict";
import { checkLiveSession, clearInvalidSession } from "./checklivesession.ts";
import { resetRetryAttempts, getRetryAttempts } from "./handlewhenlistenhaserror.ts";
import { getSession } from "./getsession.ts";
import { createSocket } from "./socket.ts";
import gradient from "gradient-string";
import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../../package.json"), "utf-8"));

let hasBooted = false;

function getTermWidth() {
    return process.stdout.columns || 100;
}

function printCentered(text, rawLength) {
    const termWidth = Math.max(getTermWidth() - 2, 50);
    const length = rawLength || text.replace(/\x1B\[\d+m/g, "").length;
    const padding = Math.floor((termWidth - length) / 2);
    const paddedText = " ".repeat(padding > 0 ? padding : 0) + text;
    console.log(paddedText);
}

function getCenteredLine(text, fullWidth = false) {
    const maxTermWidth = Math.min(getTermWidth() - 2, 50);
    const actualTermWidth = getTermWidth() - 2;
    
    if (text) {
        text = ` ${text.trim()} `;
        const length = text.length;
        const remainingSpace = fullWidth ? actualTermWidth - length : maxTermWidth - length;
        let padding = Math.floor(remainingSpace / 2);
        if (padding < 0 || isNaN(padding)) padding = 0;
        
        const dashes = Array(padding).fill("─").join("");
        return dashes + text + dashes;
    } else {
        return Array(fullWidth ? actualTermWidth : maxTermWidth).fill("─").join("");
    }
}

function printLoginInfo(data) {
    const { timeStr, dateStr, formattedNum, code } = data;
    const config = global.getBotConfig();
    const portInfo = (config.autoUptime?.enable && config.autoUptime?.port) 
        ? `  \x1B[90m|\x1B[0m  Port: ${config.autoUptime.port}` 
        : "";
        
    if (code) {
        console.log(`  \x1B[90m${dateStr} ${timeStr}\x1B[0m  Logging in: \x1B[36m${formattedNum}\x1B[0m  \x1B[90m|\x1B[0m  PAIRING CODE: \x1B[1m\x1B[32m${code}\x1B[0m${portInfo}`);
        console.log(`  \x1B[90mNote: If the code expires, delete the '${config.sessionFolder}' folder and restart.\x1B[0m`);
    } else {
        console.log(`  \x1B[90m${dateStr} ${timeStr}\x1B[0m  Logging in: \x1B[36m${formattedNum}\x1B[0m${portInfo}`);
    }
}

export function printBootLogo() {
    if (hasBooted) return;
    process.stdout.write("\x1B]2;Cherry Bot - Made by Yugant Xettri\x1B\\");
    
    const logos = [
        [
            " ██████╗██╗  ██╗███████╗██████╗ ██████╗ ██╗   ██╗",
            "██╔════╝██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝",
            "██║     ███████║█████╗  ██████╔╝██████╔╝ ╚████╔╝",
            "██║     ██╔══██║██╔══╝  ██╔══██╗██╔══██╗  ╚██╔╝",
            "╚██████╗██║  ██║███████╗██║  ██║██║  ██║   ██║",
            " ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝",
        ],
        [` C H E R R Y  B O T  @${packageJson.version}`],
        ["CHERRY BOT"],
    ];
    
    const termWidth = getTermWidth();
    const logoToUse = (termWidth > 58 ? logos[0] : termWidth > 36 ? logos[1] : logos[2]) || logos[2];
    
    for (const line of logoToUse) {
        printCentered(gradient("#FA8BFF", "#2BD2FF", "#2BFF88")(line), line.length);
    }
    
    const title = `Cherry Bot @${packageJson.version} - A simple WhatsApp bot`;
    printCentered(gradient("#9F98E8", "#AFF6CF")(title), title.length);
    
    const subtitle1 = "Created by Yugant Xettri";
    const subtitle2 = "A fast, modular WhatsApp bot built with Baileys";

    printCentered(gradient("#9F98E8", "#AFF6CF")(subtitle1), subtitle1.length);
    printCentered(gradient("#9F98E8", "#AFF6CF")(subtitle2), subtitle2.length);

    console.log(gradient("#FA8BFF", "#2BD2FF")(getCenteredLine(null, true)));
    hasBooted = true;
}

export async function loginToWhatsApp() {
    const config = global.getBotConfig();
    printBootLogo();
    
    let tz = "UTC";
    try {
        const configJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../../config.json"), "utf-8"));
        if (configJson.timeZone || configJson.timezone) tz = configJson.timeZone || configJson.timezone;
    } catch {}
    
    const { state, saveCreds } = await getSession(config.sessionFolder);
    
    if (!checkLiveSession(state, config.number)) {
        const timePrefix = `\x1B[90m${moment().tz(tz).format("DD/MM/YY HH:mm:ss")}\x1B[0m`;
        console.log(`  ${timePrefix}  \x1B[33m[System] Phone number changed. Clearing session...\x1B[0m`);
        clearInvalidSession(config.sessionFolder);
        resetRetryAttempts();
        return global.connectToWhatsApp();
    }
    
    const sock = await createSocket(state, global.pino({ level: "silent" }));
    let hasPrintedLogin = false;
    
    return new Promise((resolve) => {
        sock.ev.on("connection.update", async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr && config.printQR !== false) {
                global.qrcode.generate(qr, { small: true }, () => {});
            }
            
            if (connection === "close") {
                resolve(null);
                global.handleReconnect(lastDisconnect);
            } else if (connection === "open") {
                const msgStr = (global as any).lang?.connection?.success() || "✓ Connected to WhatsApp!";
                const termWidth = getTermWidth();
                const dashCount = Math.floor((termWidth - (msgStr.length + 2)) / 2);
                const dashes = "─".repeat(Math.max(0, dashCount));
                console.log(`\n\x1B[90m${dashes} \x1B[32m${msgStr}\x1B[90m ${dashes}\x1B[0m\n`);
                resetRetryAttempts();
                
                if (config.number) {
                    const jid = global.getFormattedJid(config.number);
                    if (jid) {
                        sock.sendMessage(jid, { text: global.lang.startup.message() }).catch(() => {});
                    }
                }
                resolve(sock);
            }
        });
        
        if (config.number && config.number.toLowerCase() !== "stupid") {
            const cleanNum = config.number.replace(/\D/g, "");
            if (cleanNum) {
                const formattedNum = `+${cleanNum.slice(0, 3)} ${cleanNum.slice(3)}`;
                const timeObj = moment().tz(tz);
                const timeStr = timeObj.format("HH:mm:ss");
                const dateStr = timeObj.format("DD/MM/YY");
                
                if (sock.authState.creds.registered) {
                    if (getRetryAttempts() === 0) {
                        printLoginInfo({ timeStr, dateStr, formattedNum });
                    }
                } else if (!hasPrintedLogin) {
                    hasPrintedLogin = true;
                    setTimeout(async () => {
                        if (!sock.authState.creds.registered) {
                            try {
                                const code = await sock.requestPairingCode(cleanNum);
                                printLoginInfo({ timeStr, dateStr, formattedNum, code });
                            } catch (err) {
                                console.error(`  \x1B[90m${dateStr} ${timeStr}\x1B[0m  \x1B[31m[System] Failed to request pairing code: ${err?.message || err}\x1B[0m`);
                            }
                        }
                    }, 2000);
                }
            } else {
                const timePrefix = `\x1B[90m${moment().tz(tz).format("DD/MM/YY HH:mm:ss")}\x1B[0m`;
                console.log(`  ${timePrefix}  \x1B[33m[Warning] ${global.lang?.pairing?.noDigits() || "No valid digits found in config.number."}\x1B[0m`);
                resolve(sock);
            }
        } else {
            const timePrefix = `\x1B[90m${moment().tz(tz).format("DD/MM/YY HH:mm:ss")}\x1B[0m`;
            console.log(`  ${timePrefix}  \x1B[33m[Warning] ${global.lang?.pairing?.invalidNumber() || "Invalid number configured."}\x1B[0m`);
            resolve(sock);
        }
        
        sock.ev.on("creds.update", saveCreds);
    });
}
