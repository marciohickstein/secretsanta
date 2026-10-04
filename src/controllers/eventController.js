"use strict"

require('module-alias/register');

const config = require('@config');
const EventModel = require('@models/eventModel');
const ParticipantModel = require('@models/participantModel');
const email = require('@utils/emailSender');
const whatsapp = require('@utils/whatsAppSender');
const sms = require('@utils/smsSender');
const Template = require('@utils/template');
const { validateEvent } = require('@utils/validation');
const { newToken, safeEqual } = require('@utils/security');

const { sendEmails, sendTextMessages, sendSms, drawParticipants, getBaseUrl } = require('@utils/util');
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

const createParticipants = async (host, participants) => {
	const ids = [];

	for (const participant of [host, ...participants]) {
		const created = await ParticipantModel.create({ ...participant, editToken: newToken() });
		ids.push(created.id);
	}

	return ids;
}

/* Carrega os participantes do evento; participantes antigos sem token de edicao recebem um */
const getParticipants = async ({ host, participants }) => {
	const list = [];

	for (const id of [host, ...(participants || [])]) {
		let [participant] = await ParticipantModel.get(id);

		if (!participant)
			return null;

		if (!participant.editToken) {
			participant = await ParticipantModel.update(participant.id, { editToken: newToken() });
		}

		list.push(participant);
	}

	return list;
}

const withLinks = (baseUrl, eventId, participant) => ({
	...participant,
	urlAddWishList: `${baseUrl}/crudWishlist.html?idparticipant=${encodeURIComponent(participant.id)}&token=${encodeURIComponent(participant.editToken)}`,
	urlShowWishList: `${baseUrl}/wishlist.html?idparticipant=${encodeURIComponent(participant.id)}&idevent=${encodeURIComponent(eventId)}`,
});

const isValidDrawToken = (event, token) => {
	// Eventos criados antes do token de sorteio usavam ?draw=true
	if (!event.drawToken) return token === 'true';
	return safeEqual(token, event.drawToken);
}

const alreadyDrawnPage = (event) => {
	const template = new Template(config.templates.emailEventAlreadyCreated, true);
	template.assign('DATE_EVENT_DRAW', new Date(event.event_drawn).toLocaleString('pt-BR'));
	return template.replace();
}

const draw = async (req, res, event) => {
	if (!isValidDrawToken(event, req.query.draw))
		return res.status(404).json(NOT_FOUND);

	if (event.event_drawn)
		return res.send(alreadyDrawnPage(event));

	const participants = await getParticipants(event);

	if (!participants || participants.length < config.limits.minParticipants) {
		logger.error('draw: participantes do evento não encontrados', { eventId: event.id });
		return res.status(500).json({ error: true, message: "Não foi possível sortear este evento." });
	}

	// Marca o evento como sorteado de forma atomica para evitar sorteio/envio em duplicidade
	const drawnAt = Date.now();
	const claimed = await EventModel.update(event.id, { event_drawn: drawnAt }, { onlyIf: current => !current.event_drawn });

	if (!claimed)
		return res.send(alreadyDrawnPage((await EventModel.get(event.id))[0]));

	const baseUrl = getBaseUrl(req);
	const listDrawn = drawParticipants(participants.map(p => withLinks(baseUrl, event.id, p)));

	await EventModel.update(event.id, {
		participants_drawn: listDrawn.map(({ friend, receiver }) => ({ friend: friend.id, receiver: receiver.id })),
	});

	const subject = `Amigo Secreto`;
	const hostName = participants[0].name;

	if (config.notifications.email)    sendEmails(listDrawn, hostName, subject, event.message);
	if (config.notifications.whatsapp) sendTextMessages(listDrawn, hostName, subject, event.message);
	if (config.notifications.sms)      sendSms(listDrawn, hostName, subject, event.message);

	logger.info('Sorteio realizado', { eventId: event.id, participants: participants.length });

	const templateEventCreated = new Template(config.templates.emailEventCreated, true);
	return res.send(templateEventCreated.replace());
}

const eventController = {};

eventController.getOne = async (req, res) => {
	const [event] = await EventModel.get(req.params.id);

	if (!event)
		return res.status(404).json(NOT_FOUND);

	if (req.query.draw !== undefined)
		return draw(req, res, event);

	return res.status(200).json(toPublicEvent(event));
};

eventController.create = async (req, res) => {
	const { event, host, participants } = validateEvent(req.body);

	const participantIds = await createParticipants(host, participants);

	const eventCreated = await EventModel.create({
		...event,
		host: participantIds[0],
		participants: participantIds.slice(1),
		drawToken: newToken(),
		created_at: Date.now(),
	});

	logger.info('Evento criado com sucesso', { eventId: eventCreated.id, participants: participantIds.length });

	const url = `${getBaseUrl(req)}/event/${encodeURIComponent(eventCreated.id)}?draw=${encodeURIComponent(eventCreated.drawToken)}`;

	const template = new Template();

	template.assign('HOST_NAME', host.name);
	template.assign('URL_TO_SORT', url);

	if (config.notifications.email) {
		template.setTemplate(config.templates.emailHost, true);
		email.send(host.email, 'Amigo Secreto', template.replace());
	}

	if (host.celphone && config.notifications.whatsapp) {
		template.setTemplate(config.templates.textHost, true);
		whatsapp.send(host.celphone, 'Amigo Secreto', template.replace());
	}

	if (host.celphone && config.notifications.sms) {
		template.setTemplate(config.templates.textHost, true);
		sms.send(host.celphone, 'Amigo Secreto', template.replace());
	}

	return res.status(201).json(toPublicEvent(eventCreated));
};

module.exports = eventController;
