"use strict"

require('module-alias/register');

const router = require('express').Router();
const ParticipantController = require('@controllers/participantController');

router.get('/:id', ParticipantController.getOne);

module.exports = router;
