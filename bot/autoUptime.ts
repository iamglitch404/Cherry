import axios from "axios";
import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getTimestamp() {
    let timezone = "UTC";
    try {
        const config = JSON.parse(fs.readFileSync(path.join(__dirname, "../../config.json"), "utf-8"));
        if (config.timeZone || config.timezone) timezone = config.timeZone || config.timezone;
    } catch {}
    return `\x1B[90m${moment().tz(timezone).format("DD/MM/YY HH:mm:ss")}\x1B[0m`;
}

export function startAutoUptime() {
    const config = global.getBotConfig ? global.getBotConfig() : {};
    if (global.timeOutUptime !== undefined) clearTimeout(global.timeOutUptime);
    if (!config.autoUptime || !config.autoUptime.enable) return;

    let port = 3001;
    try {
        const configJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../../config.json"), "utf-8"));
        port = configJson.dashBoard?.port || configJson.autoUptime?.port || 3001;
    } catch {}

    let url = config.autoUptime.url ? config.autoUptime.url.trim() : `http://127.0.0.1:${port}`;
    if (!url.endsWith("/uptime")) url += "/uptime";

    let status = "ok";
    const interval = (config.autoUptime.timeInterval || 180) * 1000;

    global.timeOutUptime = setTimeout(async function ping() {
        try {
            await axios.get(url, { timeout: 8000 });
            if (status !== "ok") {
                status = "ok";
                console.log(`  ${getTimestamp()}  \x1B[32m[UPTIME] Cherry Bot is online (${url})\x1B[0m`);
            }
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.code || err.message || "Connection refused";
            if (status === "ok") {
                status = "failed";
                console.error(`  ${getTimestamp()}  \x1B[31m[UPTIME] Ping failed: ${errorMsg}\x1B[0m`);
            }
        }
        global.timeOutUptime = setTimeout(ping, interval);
    }, interval);

    console.log(`  ${getTimestamp()}  \x1B[90m[UPTIME] Uptime loop started for ${url}\x1B[0m`);
}
