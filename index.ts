// @ts-nocheck
"use strict";
import { spawn } from "child_process";
import log from "./logger/log.ts";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function startBot() {
    const child = spawn(process.execPath || "node", ["Cherry.ts"], {
        cwd: __dirname,
        stdio: "inherit"
    });

    child.on("close", (code) => {
        if (code === 2) {
            if (log.info) log.info("Restarting Project...");
            else console.log("Restarting Project...");
            startBot();
        }
    });
}

startBot();
