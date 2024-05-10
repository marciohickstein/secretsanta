"use strict"

require('module-alias/register');
const { getRootPath, resolvePath } = require('@utils/util')
const BasicModel = require('@models/basicModel');

const fileData = process.env.TEST >= Number("0") ? `${getRootPath()}/data/participants-test-${process.env.TEST}.json` : `${getRootPath()}/data/participants.json`;

const participantModel = new BasicModel(fileData);

participantModel.readData();

module.exports = participantModel;

