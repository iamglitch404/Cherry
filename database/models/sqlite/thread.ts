// @ts-nocheck
"use strict";

import { DataTypes } from "sequelize";

export default function defineThreadModel(sequelize) {
  return sequelize.define("Thread", {
    threadID: {
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
