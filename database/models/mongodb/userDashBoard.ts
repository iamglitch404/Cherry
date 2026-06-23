// @ts-nocheck
"use strict";import e from"mongoose";const t=new e.Schema({userID:{type:String,required:!0,unique:!0},data:{type:e.Schema.Types.Mixed,default:{}}},{timestamps:!0});export default e.model("UserDashBoard",t);
