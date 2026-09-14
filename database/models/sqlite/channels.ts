// @ts-nocheck
"use strict";

import { DataTypes } from "sequelize";

export default function defineChannelsModel(sequelize) {
  return sequelize.define("Channels", {
    channelID: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    data: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  });
}
