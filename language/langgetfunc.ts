// @ts-nocheck
"use strict";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getLanguage() {
    try {
        const cfgPath = path.resolve(__dirname, "../config.json");
        if (fs.existsSync(cfgPath)) {
            const t = JSON.parse(fs.readFileSync(cfgPath, "utf-8"));
            if (t && typeof t.language === "string") return t.language.trim();
        }
    } catch (n) {
        console.error("Error reading language config:", n);
    }
    return "en";
}

const langMap: Record<string, string> = {};

function loadLang() {
    const lang = getLanguage();
    const langFilePath = path.resolve(__dirname, `${lang}.lang`);
    if (fs.existsSync(langFilePath)) {
        const lines = fs.readFileSync(langFilePath, "utf-8").split(/\r?\n/);
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const idx = trimmed.indexOf("=");
            if (idx !== -1) {
                const key = trimmed.substring(0, idx).trim();
                const val = trimmed.substring(idx + 1).trim().replace(/\\n/g, '\n');
                langMap[key] = val;
            }
        }
    } else {
        console.warn(`Language file ${langFilePath} not found. Falling back to default keys.`);
    }
}

loadLang();

export function getLang(key: string, ...args: any[]) {
    const template = langMap[key] || key;
    return template.replace(/%(\d+)/g, (match, digits) => {
        const idx = parseInt(digits, 10) - 1;
        return (idx >= 0 && idx < args.length && args[idx] !== undefined) ? String(args[idx]) : match;
    });
}

function createProxy(key: string) {
    const fn = (...args: any[]) => getLang(key, ...args);
    return new Proxy(fn, {
        get(target, prop) {
            if (typeof prop === "string") {
                if (prop === "toString" || prop === "valueOf") return () => getLang(key);
                return createProxy(`${key}.${prop}`);
            }
            return (target as any)[prop];
        }
    });
}

export const langProxy = new Proxy({}, {
    get(target, prop) {
        if (typeof prop === "string") {
            return createProxy(prop);
        }
        return (target as any)[prop];
    }
});

(global as any).getLang = getLang;
(global as any).lang = langProxy;

export default { getLang, lang: langProxy };
