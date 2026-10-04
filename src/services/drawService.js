"use strict"

require('module-alias/register');

const config = require('@config');
const EventModel = require('@models/eventModel');
const ParticipantModel = require('@models/participantModel');
const Template = require('@utils/template');
const notifications = require('@services/notificationService');
const { newToken } = require('@utils/security');
const { drawParticipants, buildParticipantMessage, sendTextMessages, sendSms } = require('@utils/util');
const logger = require('@utils/logger');

const SUBJECT = 'Amigo Secreto';

/* Token do organizador (eventos criados antes do painel usavam drawToken) */
const organizerToken = (event) => event.adminToken || event.drawToken || null;

const organizerUrl = (baseUrl, event) =>
	`${baseUrl}/painel.html?event=${encodeURIComponent(event.id)}&token=${encodeURIComponent(organizerToken(event))}`;

/* Garante que o evento tenha token do organizador e o retorna atualizado */
async function ensureOrganizerToken(event) {
	if (organizerToken(event)) return event;
	return EventModel.update(event.id, { adminToken: newToken() });
}

/* Carrega os participantes do evento (organizador primeiro); antigos sem token de edicao recebem um */
async function loadParticipants(event) {
	const list = [];

	for (const id of [event.host, ...(event.participants || [])]) {
		let [participant] = await ParticipantModel.get(id);

		if (!participant) return null;

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

/* E-mail do organizador com o link do painel */
function sendOrganizerEmail(baseUrl, event, host) {
	const url = organizerUrl(baseUrl, event);
	const template = new Template();

	template.assign('HOST_NAME', host.name);
	template.assign('URL_PANEL', url);

	if (config.notifications.email) {
		template.setTemplate(config.templates.emailHost, true);
		notifications.sendTrackedEmail(host, 'organizer', SUBJECT, template.replace());
	}

	return template;
}

/* E-mail do sorteio para um participante (friend), indicando quem ele tirou (receiver) */
function sendDrawEmail(baseUrl, event, hostName, friend, receiver) {
	const secret = {
		friend: withLinks(baseUrl, event.id, friend),
		receiver: withLinks(baseUrl, event.id, receiver),
	};

	const html = buildParticipantMessage(config.templates.emailParticipant, secret, hostName, event.message);
	return notifications.sendTrackedEmail(secret.friend, 'draw', SUBJECT, html);
}

/*
 * Realiza o sorteio. Retorna o evento atualizado ou null se ja estava sorteado.
 * Os e-mails sao enviados em segundo plano (fila).
 */
async function draw(baseUrl, event) {
	const participants = await loadParticipants(event);

	if (!participants || participants.length < config.limits.minParticipants) {
		throw new Error(`Participantes do evento ${event.id} não encontrados`);
	}

	// Marca o evento como sorteado de forma atomica para evitar sorteio/envio em duplicidade
	const claimed = await EventModel.update(event.id, { event_drawn: Date.now() }, { onlyIf: current => !current.event_drawn });

	if (!claimed) return null;

	const pairs = drawParticipants(participants);

	const updated = await EventModel.update(event.id, {
		participants_drawn: pairs.map(({ friend, receiver }) => ({ friend: friend.id, receiver: receiver.id })),
	});

	const hostName = participants[0].name;

	if (config.notifications.email) {
		for (const { friend, receiver } of pairs) {
			sendDrawEmail(baseUrl, updated, hostName, friend, receiver);
		}
	}

	const linked = pairs.map(({ friend, receiver }) => ({
		friend: withLinks(baseUrl, event.id, friend),
		receiver: withLinks(baseUrl, event.id, receiver),
	}));

	if (config.notifications.whatsapp) sendTextMessages(linked, hostName, SUBJECT, event.message);
	if (config.notifications.sms)      sendSms(linked, hostName, SUBJECT, event.message);

	logger.info('Sorteio realizado', { eventId: event.id, participants: participants.length });

	return updated;
}

/* Reenvia o e-mail adequado ao momento do evento para um participante */
async function resend(baseUrl, event, participant) {
	const [host] = await ParticipantModel.get(event.host);

	if (!event.event_drawn) {
		if (participant.id !== event.host) return false;
		sendOrganizerEmail(baseUrl, event, participant);
		return true;
	}

	const pair = (event.participants_drawn || []).find(p => p.friend === participant.id);
	if (!pair) return false;

	let [receiver] = await ParticipantModel.get(pair.receiver);
	if (!receiver) return false;

	sendDrawEmail(baseUrl, event, host ? host.name : '', participant, receiver);
	return true;
}

module.exports = { organizerToken, organizerUrl, ensureOrganizerToken, loadParticipants, sendOrganizerEmail, draw, resend };
