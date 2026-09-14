// @ts-nocheck
"use strict";
import { Sequelize } from "sequelize";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import threadDef from "../models/sqlite/thread.ts";
import userDef from "../models/sqlite/user.ts";
import userDashBoardDef from "../models/sqlite/userDashBoard.ts";
import globalDef from "../models/sqlite/global.ts";
import communitiesDef from "../models/sqlite/communities.ts";
import channelsDef from "../models/sqlite/channels.ts";
import messageDef from "../models/sqlite/message.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function connectSqlite() {
    const dbDir = path.resolve(__dirname, "../../database/data");
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    const storagePath = path.join(dbDir, "data.sqlite");

    const sequelize = new Sequelize({
        dialect: "sqlite",
        storage: storagePath,
        logging: false
    });

    const threadModel = threadDef(sequelize);
    const userModel = userDef(sequelize);
    const dashBoardModel = userDashBoardDef(sequelize);
    const globalModel = globalDef(sequelize);
    const communitiesModel = communitiesDef(sequelize);
    const channelsModel = channelsDef(sequelize);
    const messageModel = messageDef(sequelize);

    await sequelize.sync({ force: false });

    return {
        threadModel,
        userModel,
        dashBoardModel,
        globalModel,
        communitiesModel,
        channelsModel,
        messageModel,
        sequelize
    };
}
