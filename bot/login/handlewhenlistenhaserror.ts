// @ts-nocheck
"use strict";
import { clearInvalidSession } from "./checklivesession.ts";
import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, "../../");

function getTimePrefix() {
    let tz = "UTC";
    try {
        const config = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "config.json"), "utf-8"));
        if (config.timeZone || config.timezone) tz = config.timeZone || config.timezone;
    } catch {}
    return `\x1B[90m${moment().tz(tz).format("DD/MM/YY HH:mm:ss")}\x1B[0m`;
}

let retryAttempts = 0;
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY = 2000;

export function handleConnectionError(lastDisconnect) {
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    
    if (statusCode === 515) {
        console.log(`  ${getTimePrefix()}  \x1B[90m[System] WhatsApp requested a restart. Reconnecting...\x1B[0m`);
        retryAttempts = 0;
        setTimeout(() => {
            global.connectToWhatsApp();
        }, 1000);
        return;
    }
    
    if (statusCode !== global.DisconnectReason?.loggedOut && statusCode !== 401 && statusCode !== 411) {
        retryAttempts++;
        if (retryAttempts <= MAX_RETRIES) {
            const delay = BASE_RETRY_DELAY * Math.pow(2, retryAttempts - 1);
            console.log(`  ${getTimePrefix()}  \x1B[90m[System] Connection closed with status ${statusCode}. Retrying in ${delay}ms (Attempt ${retryAttempts}/${MAX_RETRIES})...\x1B[0m`);
            setTimeout(() => {
                global.connectToWhatsApp();
            }, delay);
        } else {
            console.error(`  ${getTimePrefix()}  \x1B[31m[System] Connection failed after ${MAX_RETRIES} attempts.\x1B[0m`);
        }
    } else {
        console.log(`  ${getTimePrefix()}  \x1B[31m[System] Session logged out or invalid. Status: ${statusCode}\x1B[0m`);
        const config = global.getBotConfig();
        
        if (global.sock) {
            try {
                global.sock.end(undefined);
            } catch {}
        }
        
        clearInvalidSession(config.sessionFolder);
        console.log(`  ${getTimePrefix()}  \x1B[90m[System] Restarting connection to pair a new session...\x1B[0m`);
        retryAttempts = 0;
        
        setTimeout(() => {
            global.connectToWhatsApp();
        }, 2000);
    }
}

export function resetRetryAttempts() {
    retryAttempts = 0;
}

export function getRetryAttempts() {
    return retryAttempts;
}
