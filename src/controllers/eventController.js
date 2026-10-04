"use strict"

require('module-alias/register');

const config = require('@config');
const EventModel = require('@models/eventModel');
const ParticipantModel = require('@models/participantModel');
const whatsapp = require('@utils/whatsAppSender');
const sms = require('@utils/smsSender');
const drawService = require('@services/drawService');
const { validateEvent } = require('@utils/validation');
const { newToken, safeEqual } = require('@utils/security');
const { getBaseUrl } = require('@utils/util');
const logger = require('@utils/logger');

const NOT_FOUND = { error: true, message: "Evento de amigo secreto não encontrado" };

/* Campos do evento que podem ser exibidos publicamente (sem participantes, tokens ou sorteio) */
const toPublicEvent = (event) => ({
	id: event.id,
	date: event.date,
	location: event.location,
	amount: event.amount,
	participantsCount: (event.participants || []).length + 1,
	drawn: Boolean(event.event_drawn),
});

/* Links antigos de sorteio (?draw=...) agora levam ao painel do organizador */
const redirectToPanel = async (req, res, event) => {
	const token = req.query.draw;
	const current = drawService.organizerToken(event);

	// Eventos criados antes do token usavam ?draw=true
	const valid = current ? safeEqual(token, current) : token === 'true';

	if (!valid)
		return res.status(404).json(NOT_FOUND);

	const withToken = await drawService.ensureOrganizerToken(event);
	return res.redirect(302, drawService.organizerUrl(getBaseUrl(req), withToken));
}

const eventController = {};

eventController.getOne = async (req, res) => {
	const [event] = await EventModel.get(req.params.id);

	if (!event)
		return res.status(404).json(NOT_FOUND);

	if (req.query.draw !== undefined)
		return redirectToPanel(req, res, event);

	return res.status(200).json(toPublicEvent(event));
};

eventController.create = async (req, res) => {
	const { event, host, participants } = validateEvent(req.body);

	const created = [];
	for (const participant of [host, ...participants]) {
		created.push(await ParticipantModel.create({ ...participant, editToken: newToken() }));
	}

	const eventCreated = await EventModel.create({
		...event,
		host: created[0].id,
		participants: created.slice(1).map(p => p.id),
		adminToken: newToken(),
		created_at: Date.now(),
	});

	logger.info('Evento criado com sucesso', { eventId: eventCreated.id, participants: created.length });

	const baseUrl = getBaseUrl(req);
	const template = drawService.sendOrganizerEmail(baseUrl, eventCreated, created[0]);

	if (host.celphone && config.notifications.whatsapp) {
		template.setTemplate(config.templates.textHost, true);
		whatsapp.send(host.celphone, 'Amigo Secreto', template.replace());
	}

	if (host.celphone && config.notifications.sms) {
		template.setTemplate(config.templates.textHost, true);
		sms.send(host.celphone, 'Amigo Secreto', template.replace());
	}

	// O link do painel vai somente para quem criou o evento
	return res.status(201).json({
		...toPublicEvent(eventCreated),
		organizerUrl: drawService.organizerUrl(baseUrl, eventCreated),
	});
};

module.exports = eventController;
