// @ts-nocheck
"use strict";import{DataTypes as e}from"sequelize";export default function(a){return a.define("Message",{messageID:{type:e.STRING,primaryKey:!0},senderID:{type:e.STRING},threadID:{type:e.STRING},timestamp:{type:e.STRING},messageData:{type:e.JSON,defaultValue:{}}})}
