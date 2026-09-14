// @ts-nocheck
"use strict";

import { DataTypes } from "sequelize";

export default function defineGlobalModel(sequelize) {
  return sequelize.define("Global", {
    key: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    data: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  });
}
