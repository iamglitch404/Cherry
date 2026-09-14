// @ts-nocheck
"use strict";
import moment from "moment-timezone";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import connectMongoDB from "../../database/connectDB/connectMongoDB.ts";
import connectSqlite from "../../database/connectDB/connectSqlite.ts";
import initControllers from "../../database/controllers/index.ts";

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

export async function checkDataAndConnectDB() {
    try {
        const configRaw = fs.readFileSync(path.join(ROOT_DIR, "config.json"), "utf-8");
        const config = JSON.parse(configRaw);
        let models = null;
        let isMongo = false;
        
        if (config.DATABASE?.type === "mongodb" && config.DATABASE?.uri) {
            isMongo = true;
            models = await connectMongoDB(config.DATABASE.uri);
            console.log(`  ${getTimePrefix()}  \x1B[90m${global.lang.database.mongoConnected()}\x1B[0m`);
        } else {
            models = await connectSqlite();
            console.log(`  ${getTimePrefix()}  \x1B[90m${global.lang.database.sqliteConnected()}\x1B[0m`);
        }
        
        const controllers = initControllers(models);
        global.db = Object.assign(global.db || {}, controllers);
        global.models = models;
    } catch (err) {
        console.error(`\x1B[31m  ${getTimePrefix()}  ${global.lang.database.sqliteError(err.message)}\x1B[0m`);
    }
}
