// @ts-nocheck
"use strict";

import { DataTypes } from "sequelize";

export default function defineMessageModel(sequelize) {
  return sequelize.define("Message", {
    messageID: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    senderID: {
      type: DataTypes.STRING,
    },
    threadID: {
      type: DataTypes.STRING,
    },
    timestamp: {
      type: DataTypes.STRING,
    },
    messageData: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  });
}
