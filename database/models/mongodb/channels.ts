// @ts-nocheck
"use strict";

import mongoose from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    channelID: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      default: "",
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export default mongoose.model("Channels", channelSchema);
