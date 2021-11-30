"use strict"

require('module-alias/register');
const BasicModel = require('@models/basicModel');
const { getRootPath } = require('@utils/util')

const fileData = process.env.TEST === "1" ? `${getRootPath()}/data/wishlist-test.json` : `${getRootPath()}/data/wishlist.json`;

const model = new BasicModel(fileData);
model.readData();

module.exports = model;