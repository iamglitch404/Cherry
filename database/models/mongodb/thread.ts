// @ts-nocheck
"use strict";

import mongoose from "mongoose";

const threadSchema = new mongoose.Schema(
  {
    threadID: {
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

export default mongoose.model("Thread", threadSchema);
