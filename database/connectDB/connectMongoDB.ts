// @ts-nocheck
"use strict";
import mongoose from "mongoose";
import threadModel from "../models/mongodb/thread.ts";
import userModel from "../models/mongodb/user.ts";
import dashBoardModel from "../models/mongodb/userDashBoard.ts";
import globalModel from "../models/mongodb/global.ts";
import communitiesModel from "../models/mongodb/communities.ts";
import channelsModel from "../models/mongodb/channels.ts";
import messageModel from "../models/mongodb/message.ts";

export default async function connectMongoDB(uri: string) {
    await mongoose.connect(uri);
    return {
        threadModel,
        userModel,
        dashBoardModel,
        globalModel,
        communitiesModel,
        channelsModel,
        messageModel
    };
}
