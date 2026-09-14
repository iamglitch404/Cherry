// @ts-nocheck
"use strict";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { execSync, execFileSync } from "child_process";
import moment from "moment-timezone";

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

const fileToCmdMap = new Map();
const eventMap = new Map();
const socketEventProxies = new WeakMap();

let currentCmdFile = null;
let currentEventFile = null;
let cmdsLoaded = false;
let eventsLoaded = false;

global.commandintro = (cmd) => {
    if (cmd && cmd.name) {
        if (!cmd.author) {
            console.warn(global.lang.loader.skipCommand(cmd.name));
            return;
        }
        const lowerName = cmd.name.toLowerCase();
        if (currentCmdFile) {
            const oldName = fileToCmdMap.get(currentCmdFile);
            if (oldName && oldName !== lowerName) {
                global.commands.delete(oldName);
            }
            fileToCmdMap.set(currentCmdFile, lowerName);
        }
        global.commands.set(lowerName, cmd);

        if (cmd.onEvent && typeof cmd.onEvent === "object") {
            for (const [eventName, handler] of Object.entries(cmd.onEvent)) {
                if (typeof handler !== "function") continue;
                if (!eventMap.has(eventName)) eventMap.set(eventName, new Map());

                const eventId = `__cmd__${lowerName}__${eventName}`;
                eventMap.get(eventName).set(eventId, { eventName, execute: handler });
                if (global.sock) registerEventProxy(global.sock, eventName);
            }
        }
    }
};
global.commandIntro = global.commandintro;
global.createCommand = global.commandintro;

global.createEvent = (evt) => {
    if (evt && evt.eventName && typeof evt.execute === "function") {
        const evtName = evt.eventName;
        if (!eventMap.has(evtName)) eventMap.set(evtName, new Map());
        if (currentEventFile) {
            eventMap.get(evtName).set(currentEventFile, evt);
            if (global.sock) registerEventProxy(global.sock, evtName);
        }
    }
};

async function loadCmdFile(filename, fullPath) {
    try {
        currentCmdFile = filename;
        const module = await import(`${pathToFileURL(fullPath).toString()}?update=${Date.now()}`);
        const exported = module.default || module;

        let reconstructed = null;
        if (exported && exported.config && exported.config.name) {
            reconstructed = { ...exported.config };
            for (const key in exported) {
                if (key !== "config") reconstructed[key] = exported[key];
            }
        } else if (exported && exported.name) {
            reconstructed = { ...exported };
        }

        if (reconstructed && reconstructed.name) {
            global.commandintro(reconstructed);
            console.log(`  ${getTimePrefix()}  \x1B[90m${global.lang.loader.loadedCommand(reconstructed.name)}\x1B[0m`);
        }
        currentCmdFile = null;
    } catch (e) {
        console.error(`  ${getTimePrefix()}  \x1B[31m${global.lang.loader.failedLoadCommand(filename, e.message || String(e))}\x1B[0m`, e);
        currentCmdFile = null;
    }
}

export async function loadCommands() {
    if (cmdsLoaded) return;
    cmdsLoaded = true;

    const cmdsDir = path.join(ROOT_DIR, "scripts", "cmds");
    if (!fs.existsSync(cmdsDir)) fs.mkdirSync(cmdsDir, { recursive: true });

    const files = fs.readdirSync(cmdsDir);
    for (const file of files) {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
            await loadCmdFile(file, path.join(cmdsDir, file));
        }
    }
    watchCommands(cmdsDir);
}

function watchCommands(dir) {
    fs.watch(dir, async (event, filename) => {
        if (filename && (filename.endsWith(".ts") || filename.endsWith(".js"))) {
            const fullPath = path.join(dir, filename);
            if (fs.existsSync(fullPath)) {
                await loadCmdFile(filename, fullPath);
                console.log(`  ${getTimePrefix()}  \x1B[90m${global.lang.loader.hotReloadedCommand(filename)}\x1B[0m`);
            } else {
                const cmdName = fileToCmdMap.get(filename);
                if (cmdName) {
                    global.commands.delete(cmdName);
                    fileToCmdMap.delete(filename);
                    console.log(`  ${getTimePrefix()}  \x1B[90m${global.lang.loader.removedCommand(cmdName, filename)}\x1B[0m`);
                }
            }
        }
    });
}

export function registerEventProxy(sock, eventName) {
    if (!socketEventProxies.has(sock)) socketEventProxies.set(sock, new Set());
    const registered = socketEventProxies.get(sock);

    if (!registered.has(eventName)) {
        registered.add(eventName);
        sock.ev.on(eventName, async (data) => {
            const handlers = eventMap.get(eventName);
            if (handlers) {
                for (const [id, evt] of handlers.entries()) {
                    try {
                        if (typeof evt.execute === "function") {
                            await evt.execute(sock, data);
                        }
                    } catch (e) {
                        console.error(`  ${getTimePrefix()}  \x1B[31m${global.lang.loader.errorExecutingEvent(eventName, id)}\x1B[0m`, e);
                    }
                }
            }
        });
    }
}

export function registerAllEventsToSocket(sock) {
    for (const evtName of eventMap.keys()) {
        registerEventProxy(sock, evtName);
    }
}

async function loadEvtFile(filename, fullPath) {
    try {
        currentEventFile = filename;
        const module = await import(`${pathToFileURL(fullPath).toString()}?update=${Date.now()}`);
        const exported = module.default || module;
        if (exported && typeof exported === "object") {
            const evtName = exported.eventName || (typeof exported.onEvent === "function" ? "messages.upsert" : null);
            const handler = exported.execute || exported.onEvent;
            if (evtName && typeof handler === "function") {
                global.createEvent({
                    eventName: evtName,
                    name: exported.name || filename,
                    execute: handler
                });
            }
        }
        currentEventFile = null;
        console.log(`  ${getTimePrefix()}  \x1B[90m${global.lang.loader.loadedEvent(filename)}\x1B[0m`);
    } catch (e) {
        console.error(`  ${getTimePrefix()}  \x1B[31m${global.lang.loader.failedLoadEvent(filename, e.message || String(e))}\x1B[0m`, e);
        currentEventFile = null;
    }
}

export async function loadEvents() {
    if (eventsLoaded) return;
    eventsLoaded = true;

    const eventsDir = path.join(ROOT_DIR, "scripts", "events");
    if (!fs.existsSync(eventsDir)) fs.mkdirSync(eventsDir, { recursive: true });

    const files = fs.readdirSync(eventsDir);
    for (const file of files) {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
            await loadEvtFile(file, path.join(eventsDir, file));
        }
    }
    watchEvents(eventsDir);
}

function watchEvents(dir) {
    fs.watch(dir, async (event, filename) => {
        if (filename && (filename.endsWith(".ts") || filename.endsWith(".js"))) {
            const fullPath = path.join(dir, filename);
            if (fs.existsSync(fullPath)) {
                for (const [evtName, handlers] of eventMap.entries()) {
                    if (handlers.has(filename)) handlers.delete(filename);
                }
                await loadEvtFile(filename, fullPath);
                console.log(`  ${getTimePrefix()}  \x1B[90m${global.lang.loader.hotReloadedEvent(filename)}\x1B[0m`);
            } else {
                for (const [evtName, handlers] of eventMap.entries()) {
                    if (handlers.has(filename)) {
                        handlers.delete(filename);
                        console.log(`  ${getTimePrefix()}  \x1B[90m${global.lang.loader.removedEvent(filename, evtName)}\x1B[0m`);
                    }
                }
            }
        }
    });
}

export async function checkAndLoadScripts() {
    console.log(`  ${getTimePrefix()}  \x1B[90m${global.lang.loader.checkingDependencies()}\x1B[0m`);

    const cmdsDir = path.join(ROOT_DIR, "scripts", "cmds");
    const eventsDir = path.join(ROOT_DIR, "scripts", "events");
    const pkgPath = path.join(ROOT_DIR, "package.json");

    let pkg = {};
    if (fs.existsSync(pkgPath)) {
        pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    }
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

    const coreModules = new Set([
        "fs", "path", "url", "crypto", "child_process", "os", "http", "https", "net",
        "util", "events", "stream", "buffer", "querystring", "zlib", "assert", "readline",
        "tty", "tls", "dns", "dgram", "v8", "vm", "worker_threads", "perf_hooks",
        "string_decoder", "diagnostics_channel", "wasi", "module", "moment-timezone", "axios",
        "sqlite3", "sqlite", "pino", "qrcode-terminal", "@hapi/boom", "@whiskeysockets/baileys"
    ]);

    const missing = new Set();
    const regex = /from\s+['"]([^'".\/\\]+)['"]|require\s*\(\s*['"]([^'".\/\\]+)['"]\s*\)/g;

    const scanDir = (dir) => {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file.endsWith(".ts") || file.endsWith(".js")) {
                const content = fs.readFileSync(path.join(dir, file), "utf-8");
                let match;
                while ((match = regex.exec(content)) !== null) {
                    const mod = match[1] || match[2];
                    if (mod && !coreModules.has(mod) && !allDeps[mod] && !mod.startsWith(".") && !mod.startsWith("/")) {
                        missing.add(mod);
                    }
                }
            }
        }
    };

    scanDir(cmdsDir);
    scanDir(eventsDir);

    const VALID_PKG_REGEX = /^(@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i;
    if (missing.size > 0) {
        const safePkgs = Array.from(missing).filter(pkg => VALID_PKG_REGEX.test(pkg));
        if (safePkgs.length > 0) {
            const missingStr = safePkgs.join(" ");
            console.log(`  ${getTimePrefix()}  \x1B[33m${global.lang.loader.installingDependencies(missingStr)}\x1B[0m`);
            try {
                execFileSync("npm", ["install", ...safePkgs], { stdio: "inherit", cwd: ROOT_DIR });
                console.log(`  ${getTimePrefix()}  \x1B[32m${global.lang.loader.installedDependencies()}\x1B[0m`);
            } catch {
                console.error(`  ${getTimePrefix()}  \x1B[31m${global.lang.loader.failedInstallDependencies()}\x1B[0m`);
            }
        }
    }

    const start = Date.now();
    await loadCommands();
    await loadEvents();
    const ms = Date.now() - start;

    let evtCount = 0;
    for (const handlers of eventMap.values()) {
        evtCount += handlers.size;
    }

    console.log(`  ${getTimePrefix()}  \x1B[32m${global.lang.loader.loadSummary(global.commands.size, evtCount, ms)}\x1B[0m`);
}
