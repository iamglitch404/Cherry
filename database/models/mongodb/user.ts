// @ts-nocheck
"use strict";import e from"mongoose";const t=new e.Schema({userID:{type:String,required:!0,unique:!0},name:{type:String,default:""},data:{type:e.Schema.Types.Mixed,default:{}}},{timestamps:!0});export default e.model("User",t);
