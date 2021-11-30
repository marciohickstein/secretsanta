"use strict"

require('module-alias/register');

const router = require('express').Router();
const EventController = require('@controllers/eventController');

router.get('/', EventController.getAll);
router.get('/:id', EventController.getOne);
router.post('/', EventController.create);
router.delete('/:id', EventController.delete);

module.exports = router;