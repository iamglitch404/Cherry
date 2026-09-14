// @ts-nocheck
"use strict";

export async function createSocket(authState: any, logger: any) {
    let version = [2, 3000, 1015901307];
    try {
        if (global.fetchLatestWaWebVersion) {
            const waWeb = await global.fetchLatestWaWebVersion();
            if (waWeb?.version) version = waWeb.version;
        } else if (global.fetchLatestBaileysVersion) {
            const bVersion = await global.fetchLatestBaileysVersion();
            if (bVersion?.version) version = bVersion.version;
        }
    } catch {}

    const browser = global.Browsers ? global.Browsers.ubuntu("Chrome") : ["Ubuntu", "Chrome", "22.04.4"];
    const sock = global.makeWASocket({
        auth: authState,
        logger,
        browser,
        version,
        syncFullHistory: false,
        printQRInTerminal: false,
        generateHighQualityLinkPreview: false,
        markOnlineOnConnect: false,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000
    });
    global.sock = sock;
    return sock;
}
