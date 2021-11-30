"use strict"

require('module-alias/register');

const BasicController = require('@controllers/basicController');
const ParticipantModel = require('@models/participantModel');

const participantController = new BasicController(ParticipantModel);

module.exports = participantController;