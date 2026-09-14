// @ts-nocheck
"use strict";

import { Schema, model } from "mongoose";

const messageSchema = new Schema(
  {
    messageID: {
      type: String,
      required: true,
      unique: true,
    },
    senderID: String,
    threadID: String,
    timestamp: String,
    messageData: {
      type: Object,
      default: {},
    },
  },
  { versionKey: false }
);

export default model("Message", messageSchema);
