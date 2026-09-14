// @ts-nocheck
"use strict";

import mongoose from "mongoose";

const userDashboardSchema = new mongoose.Schema(
  {
    userID: {
      type: String,
      required: true,
      unique: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model("UserDashBoard", userDashboardSchema);
