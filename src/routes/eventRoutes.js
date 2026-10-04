"use strict"

require('module-alias/register');

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const config = require('@config');
const EventController = require('@controllers/eventController');
const OrganizerController = require('@controllers/organizerController');

const createEventLimiter = rateLimit({
	windowMs: 60 * 60 * 1000,
	limit: config.limits.eventsPerHour,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: { error: true, message: 'Muitos eventos criados. Tente novamente mais tarde.' },
});

router.get('/:id', EventController.getOne);
router.post('/', createEventLimiter, EventController.create);

// Painel do organizador (exige o cabecalho X-Admin-Token)
router.get('/:id/organizer', OrganizerController.requireOrganizer, OrganizerController.get);
router.post('/:id/organizer/draw', OrganizerController.requireOrganizer, OrganizerController.draw);
router.post('/:id/organizer/participants/:participantId/resend', OrganizerController.requireOrganizer, OrganizerController.resend);
router.patch('/:id/organizer/participants/:participantId', OrganizerController.requireOrganizer, OrganizerController.updateParticipant);

module.exports = router;
