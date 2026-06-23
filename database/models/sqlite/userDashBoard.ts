// @ts-nocheck
"use strict";import{DataTypes as e}from"sequelize";export default function(a){return a.define("UserDashBoard",{userID:{type:e.STRING,primaryKey:!0},data:{type:e.JSON,defaultValue:{}}})}
