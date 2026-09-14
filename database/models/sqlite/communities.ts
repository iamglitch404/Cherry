// @ts-nocheck
"use strict";

import { DataTypes } from "sequelize";

export default function defineCommunitiesModel(sequelize) {
  return sequelize.define("Communities", {
    communityID: {
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
