"use strict"

require('module-alias/register');

const config = require('@config');
const EventModel = require('@models/eventModel');
const ParticipantModel = require('@models/participantModel');
const BasicController = require('@controllers/basicController');
const email = require('@utils/emailSender');
const whatsapp = require('@utils/whatsAppSender');
const sms = require('@utils/smsSender');
const Template = require('@utils/template');

const { sendEmails, sendTextMessages, sendSms, drawParticipants, getBaseUrl } = require('@utils/util');
const logger = require('@utils/logger');

const createParticipants = async ({ host, participants }) => {
	const listParticipants = [];

	let participantCreated = await ParticipantModel.create(host);

	if (!participantCreated)
		return null;
	listParticipants.push(participantCreated.id);

	for (const participant of participants) {
		participantCreated = await ParticipantModel.create(participant);
		if (!participantCreated)
			return null;
		listParticipants.push(participantCreated.id);
	}

	return listParticipants;
}

const getParticipant = async (id) => {
	let participant = await ParticipantModel.get(id);

	if (!Array(participant))
		return null;

	return participant[0];
}

const getParticipants = async (baseUrl, { host, participants }) => {
	const listParticipants = [];

	let [participant] = await ParticipantModel.get(host);

	if (!participant)
		return null;


	participant.urlAddWishList = `${baseUrl}/crudWishlist.html?idparticipant=${participant.id}`;
	participant.urlShowWishList = `${baseUrl}/wishlist.html?idparticipant=${participant.id}`;

	listParticipants.push(participant);

	for (const id of participants) {
		[ participant ] = await ParticipantModel.get(id);
		if (!participant)
			return null;

		participant.urlAddWishList = `${baseUrl}/crudWishlist.html?idparticipant=${participant.id}`;
		participant.urlShowWishList = `${baseUrl}/wishlist.html?idparticipant=${participant.id}`;
		
		listParticipants.push(participant);
	}

	return listParticipants;
}

const draw = async (event, participants) => {
	let eventDraw = { ...event };
	const listParticipants = [...participants];

	if (eventDraw.participants_drawn) {
		delete eventDraw.participants_drawn;
	}

	const listDrawn = drawParticipants(listParticipants);

	if (!Array.isArray(listDrawn)) {
		throw new Error({ error: true, message: "Erro ao sortear os participantes do amigo secreto" });
	}

	const subject = `Amigo Secreto`;
	const text = event.message;

	const hostName = await getParticipant(event.host);

	if (config.notifications.email)    sendEmails(listDrawn, hostName.name, subject, text);
	if (config.notifications.whatsapp) sendTextMessages(listDrawn, hostName.name, subject, text);
	if (config.notifications.sms)      sendSms(listDrawn, hostName.name, subject, text);

	eventDraw = {
		...eventDraw,
		event_drawn: Date.now(),
		participants_drawn: [...listDrawn]
	}

	const eventUpdated = await EventModel.update(eventDraw.id, eventDraw);

	return eventUpdated;
}

const eventController = new BasicController(EventModel);

eventController.getOne = async (req, res) => {
	const responseError = { error: true, message: "Evento de amigo secreto n�o encontrado" };

	if (!req.params.id)
		return res.status(404).json(responseError);

	const id = req.params.id ? req.params.id : '';
	const isGetOne = !req.query.draw;
	const event = await EventModel.get(id);

	if (!Array.isArray(event) || event.length <= 0)
		return res.status(404).json(responseError);

	if (isGetOne) {
		return res.status(200).json(event);
	}

	if (event[0].event_drawn) {
		const tags = [
			['{DATE_EVENT_DRAW}', new Date(event[0].event_drawn)],
		];
		const template = new Template(config.templates.emailEventAlreadyCreated, true);

		template.assign('DATE_EVENT_DRAW', new Date(event[0].event_drawn));

		const message = template.replace();
		return res.send(message);
	}

	const baseUrl = getBaseUrl(req);
	let participants = await getParticipants(baseUrl, event[0]);

	try {
		await draw(event[0], participants);
		const templateEventCreated = new Template(config.templates.emailEventCreated, true);
		const message = templateEventCreated.replace();
		return res.send(message);
	} catch (error) {
		return res.status(404).json(error);
	}
};

eventController.create = async (req, res, next) => {
	try {
		let event = req.body;

		if (!event || !event.host) {
			logger.warn('create event: body inválido recebido', { body: event });
			return res.status(400).json({ error: true, message: 'Dados do evento inválidos.' });
		}

		const {name: hostName, email: hostEmail, celphone: celPhone} = event.host;

		logger.info('Criando evento', { host: hostName, participantCount: (event.participants || []).length + 1 });

		const participants = await createParticipants(event);

		if (!participants) {
			logger.error('create event: falha ao criar participantes', { host: hostName });
			return res.status(500).json({ error: true, message: 'Falha ao criar participantes.' });
		}

		delete event.host;
		delete event.participants;

		event = {
			...event,
			host: participants[0],
			participants: participants.slice(1)
		}

		const eventCreated = await EventModel.create(event);

		if (!eventCreated) {
			logger.error('create event: falha ao gravar evento', { host: hostName });
			return res.status(500).json({ error: true, message: 'Falha ao gravar o evento.' });
		}

		logger.info('Evento criado com sucesso', { eventId: eventCreated.id, host: hostName });

		const baseUrl = getBaseUrl(req);
		const url = `${baseUrl}/event/${eventCreated.id}?draw=true`;

		const template = new Template();

		template.assign('HOST_NAME', hostName);
		template.assign('URL_TO_SORT', url);

		if (hostEmail && config.notifications.email) {
			template.setTemplate(config.templates.emailHost, true);
			const message = template.replace();
			email.send(hostEmail, 'Amigo Secreto', message);
		}

		if (celPhone && config.notifications.whatsapp) {
			template.setTemplate(config.templates.textHost, true);
			const message = template.replace();
			whatsapp.send(celPhone, 'Amigo Secreto', message);
		}

		if (celPhone && config.notifications.sms) {
			template.setTemplate(config.templates.textHost, true);
			const message = template.replace();
			sms.send(celPhone, 'Amigo Secreto', message);
		}


		return res.status(200).json(eventCreated);
	} catch (err) {
		logger.error('create event: erro inesperado', { message: err.message, stack: err.stack });
		next(err);
	}
};

module.exports = eventController;