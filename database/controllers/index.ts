// @ts-nocheck
"use strict";
import usersCtrl from "./users.ts";
import threadsCtrl from "./threads.ts";
import globalCtrl from "./global.ts";
import communitiesCtrl from "./communities.ts";
import channelsCtrl from "./channels.ts";
import userDashBoardCtrl from "./userDashBoard.ts";

export default function initControllers(models: any) {
    return {
        Users: usersCtrl(models.userModel),
        Threads: threadsCtrl(models.threadModel),
        Global: globalCtrl(models.globalModel),
        Communities: models.communitiesModel ? communitiesCtrl(models.communitiesModel) : null,
        Channels: models.channelsModel ? channelsCtrl(models.channelsModel) : null,
        UserDashBoard: models.dashBoardModel ? userDashBoardCtrl(models.dashBoardModel) : null,
        messageModel: models.messageModel,
        userModel: models.userModel,
        threadModel: models.threadModel,
        globalModel: models.globalModel,
        communitiesModel: models.communitiesModel,
        channelsModel: models.channelsModel,
        dashBoardModel: models.dashBoardModel
    };
}
