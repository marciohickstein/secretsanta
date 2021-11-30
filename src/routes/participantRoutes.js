"use strict"

require('module-alias/register');

const router = require('express').Router();
const ParticipantController = require('@controllers/participantController');

router.get('/', ParticipantController.getAll);
router.get('/:id', ParticipantController.getOne);
router.post('/', ParticipantController.create);
router.delete('/:id', ParticipantController.delete);

module.exports = router;