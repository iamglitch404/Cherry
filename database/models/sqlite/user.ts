// @ts-nocheck
"use strict";

import { DataTypes } from "sequelize";

export default function defineUserModel(sequelize) {
  return sequelize.define("User", {
    userID: {
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
