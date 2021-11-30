"use strict"

require('module-alias/register');

const config = require('@config');
const EventModel = require('@models/eventModel');
const ParticipantModel = require('@models/participantModel');
const BasicController = require('@controllers/basicController');

const { sendEmails, drawParticipants, sendEmail, replaceTags } = require('@utils/util');

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

const getParticipants = async ({ host, participants }) => {
	const listParticipants = [];

	let participant = await ParticipantModel.get(host);

	if (!participant)
		return null;
	listParticipants.push(participant[0]);

	for (const id of participants) {
		participant = await ParticipantModel.get(id);
		if (!participant)
			return null;
		listParticipants.push(participant[0]);
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
	sendEmails(listDrawn, hostName.name, subject, text);

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
	const responseError = { error: true, message: "Evento de amigo secreto não encontrado" };

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
		const message = replaceTags(config.templates.emailEventAlreadyCreated, tags);
		return res.send(message);
	}

	let participants = await getParticipants(event[0]);

	try {
		const eventUpdate = await draw(event[0], participants);
		const message = config.templates.emailEventCreated;
		return res.send(message);
	} catch (error) {
		return res.status(404).json(error);
	}
};

eventController.create = async (req, res) => {
	let event = req.body;
	const hostName = event.host.name;
	const hostEmail = event.host.email;

	const participants = await createParticipants(event);

	delete event.host;
	delete event.participants;

	event = {
		...event,
		host: participants[0],
		participants: participants.slice(1)
	}

	const eventCreated = await EventModel.create(event);

	const url = `${event.url}/${eventCreated.id}?draw=true`;

	const tags = [
		['{HOST_NAME}', hostName],
		['{URL_TO_SORT}', url],
	];

	const message = replaceTags(config.templates.emailHost, tags);

	sendEmail(config.email.from, hostEmail, 'Amigo Secreto', message);

	return res.status(200).json(eventCreated);
};

module.exports = eventController;