// @ts-nocheck
"use strict";import{Schema as e,model as r}from"mongoose";const s=new e({messageID:{type:String,required:!0,unique:!0},senderID:String,threadID:String,timestamp:String,messageData:{type:Object,default:{}}},{versionKey:!1});export default r("Message",s);
