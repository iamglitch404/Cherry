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
        if (config.timezone) timezone = config.timezone;
    } catch {}
    return `\x1B[90m${moment().tz(timezone).format("DD/MM/YY HH:mm:ss")}\x1B[0m`;
}

export function startAutoUptime() {
    const config = global.getBotConfig();
    if (global.timeOutUptime !== undefined) clearTimeout(global.timeOutUptime);
    if (!config.autoUptime || !config.autoUptime.enable) return;

    const port = config.autoUptime.port || 3000;
    
    let url = config.autoUptime.url || `http://localhost:${port}`;
    if (!url.endsWith("/uptime")) url += "/uptime";

    let status = "ok";
    const interval = (config.autoUptime.timeInterval || 180) * 1000;

    setTimeout(async function ping() {
        try {
            await axios.get(url);
            if (status !== "ok") {
                status = "ok";
                console.log(`  ${getTimestamp()}  [UPTIME] Cherry Bot is online`);
            }
        } catch (err: any) {
            const data = err.response?.data || err;
            if (status !== "ok") return;
            status = "failed";
            console.error(`  ${getTimestamp()}  [UPTIME] Ping failed: ${data.message || String(data)}`);
        }
        global.timeOutUptime = setTimeout(ping, interval);
    }, interval);

    console.log(`  ${getTimestamp()}  \x1B[90m[UPTIME] Uptime loop started for ${url}\x1B[0m`);
}
