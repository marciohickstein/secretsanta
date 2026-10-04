"use strict"

require('module-alias/register');

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const config = require('@config');
const EventController = require('@controllers/eventController');

const createEventLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	limit: config.limits.eventsPerHour,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: { error: true, message: 'Muitos eventos criados. Tente novamente mais tarde.' },
});

router.get('/:id', EventController.getOne);
router.post('/', createEventLimiter, EventController.create);

module.exports = router;
