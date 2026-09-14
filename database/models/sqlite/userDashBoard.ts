// @ts-nocheck
"use strict";

import { DataTypes } from "sequelize";

export default function defineUserDashboardModel(sequelize) {
  return sequelize.define("UserDashBoard", {
    userID: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    data: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
  });
}
