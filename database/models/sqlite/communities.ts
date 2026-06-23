// @ts-nocheck
"use strict";import{DataTypes as e}from"sequelize";export default function(t){return t.define("Communities",{communityID:{type:e.STRING,primaryKey:!0},name:{type:e.STRING,defaultValue:""},data:{type:e.JSON,defaultValue:{}}})}
