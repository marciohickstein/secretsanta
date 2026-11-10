"use strict"

require('module-alias/register');

const config = require('@config');
const EventModel = require('@models/eventModel');
const ParticipantModel = require('@models/participantModel');
const WishListModel = require('@models/wishlistModel');
const drawService = require('@services/drawService');
const notifications = require('@services/notificationService');
const smsNotifications = require('@services/smsNotificationService');
const { validateParticipantUpdate, checkEmailDomains } = require('@utils/validation');
const { safeEqual } = require('@utils/security');
const { mapUrl } = require('@utils/address');
const { getBaseUrl } = require('@utils/util');
const logger = require('@utils/logger');

const FORBIDDEN = { error: true, message: "Link do organizador inválido." };

/* Middleware: carrega o evento e confere o token do organizador (cabecalho X-Admin-Token) */
async function requireOrganizer(req, res, next) {
	const [event] = await EventModel.get(req.params.id);

	if (!event || !safeEqual(req.get('X-Admin-Token'), drawService.organizerToken(event)))
		return res.status(403).json(FORBIDDEN);

	req.event = event;
	next();
}

/* Visao do painel: dados dos participantes e status, nunca quem tirou quem nem o conteudo das listas */
async function buildView(event) {
	const drawn = Boolean(event.event_drawn);
	const now = Date.now();
	const participants = [];
	const loaded = [];

	for (const id of [event.host, ...(event.participants || [])]) {
		const [participant] = await ParticipantModel.get(id);
		if (!participant) continue;

		loaded.push(participant);

		const [wishlist] = await WishListModel.get(id);
		const isHost = id === event.host;
		const canResend = config.notifications.email && (drawn || isHost);
		const canResendSms = config.notifications.sms && Boolean(participant.celphone) && (drawn || isHost);

		participants.push({
			id: participant.id,
			name: participant.name,
			email: participant.email,
			celphone: participant.celphone || '',
			profile: participant.profile || '',
			isHost,
			emailStatus: notifications.emailStatusView(participant),
			wishlistItems: wishlist ? (wishlist.wishlist || []).length : null,
			canResend,
			resendAvailableAt: canResend ? notifications.resendAvailableAt(participant, now) : 0,
			smsStatus: smsNotifications.smsStatusView(participant),
			canResendSms,
			smsResendAvailableAt: canResendSms ? smsNotifications.resendAvailableAt(participant, now) : 0,
		});
	}

	// Sem webhook (ou com atraso dele), consulta o Resend em segundo plano
	if (config.notifications.email) {
		notifications.refreshPendingStatuses(loaded).catch(err =>
			logger.warn('Falha ao consultar status dos e-mails', { eventId: event.id, error: err.message }));
	}

	// Sem webhook do celular, consulta o SMS Gateway em segundo plano
	if (config.notifications.sms) {
		smsNotifications.refreshPendingStatuses(loaded).catch(err =>
			logger.warn('Falha ao consultar status dos SMS', { eventId: event.id, error: err.message }));
	}

	return {
		event: {
			id: event.id,
			date: event.date,
			location: event.location,
			mapUrl: mapUrl(event),
			amount: event.amount,
			message: event.message,
			createdAt: event.created_at || null,
			drawn,
			drawnAt: event.event_drawn || null,
		},
		emailEnabled: config.notifications.email,
		smsEnabled: config.notifications.sms,
		participants,
	};
}

const findParticipant = (event, participantId) =>
	[event.host, ...(event.participants || [])].includes(participantId);

const organizerController = { requireOrganizer };

organizerController.get = async (req, res) => {
	return res.status(200).json(await buildView(req.event));
};

organizerController.draw = async (req, res) => {
	if (req.event.event_drawn)
		return res.status(409).json({ error: true, message: "Este evento já foi sorteado." });

	const updated = await drawService.draw(getBaseUrl(req), req.event);

	if (!updated)
		return res.status(409).json({ error: true, message: "Este evento já foi sorteado." });

	return res.status(200).json(await buildView(updated));
};

organizerController.resend = async (req, res) => {
	const event = req.event;
	const { participantId } = req.params;
	const channel = req.body && req.body.channel === 'sms' ? 'sms' : 'email';
	const isSms = channel === 'sms';

	if (!(isSms ? config.notifications.sms : config.notifications.email))
		return res.status(409).json({ error: true, message: isSms ? "O envio de SMS está desativado no servidor." : "O envio de e-mails está desativado no servidor." });

	if (!findParticipant(event, participantId))
		return res.status(404).json({ error: true, message: "Participante não encontrado." });

	const [participant] = await ParticipantModel.get(participantId);

	if (!participant)
		return res.status(404).json({ error: true, message: "Participante não encontrado." });

	if (isSms && !participant.celphone)
		return res.status(400).json({ error: true, message: `${participant.name} não tem celular cadastrado.` });

	const availableAt = isSms ? smsNotifications.resendAvailableAt(participant) : notifications.resendAvailableAt(participant);
	const what = isSms ? 'o SMS' : 'o e-mail';

	if (availableAt) {
		const minutes = Math.ceil((availableAt - Date.now()) / 60000);
		return res.status(429).json({ error: true, message: `Aguarde ${minutes} minuto(s) para reenviar ${what} para ${participant.name}.` });
	}

	const sent = await drawService.resend(getBaseUrl(req), event, participant, channel);

	if (!sent)
		return res.status(409).json({ error: true, message: `Os participantes recebem ${what} quando o sorteio for feito.` });

	logger.info(isSms ? 'SMS reenviado pelo organizador' : 'E-mail reenviado pelo organizador', { eventId: event.id, participantId });

	return res.status(200).json(await buildView(event));
};

organizerController.updateParticipant = async (req, res) => {
	const event = req.event;
	const { participantId } = req.params;

	if (!findParticipant(event, participantId))
		return res.status(404).json({ error: true, message: "Participante não encontrado." });

	const update = validateParticipantUpdate(req.body);

	if (update.email) {
		await checkEmailDomains([update.email]);

		for (const id of [event.host, ...(event.participants || [])]) {
			if (id === participantId) continue;

			const [other] = await ParticipantModel.get(id);
			if (other && other.email === update.email)
				return res.status(400).json({ error: true, message: `O e-mail ${update.email} já pertence a outro participante.` });
		}
	}

	await ParticipantModel.update(participantId, update);
	logger.info('Participante atualizado pelo organizador', { eventId: event.id, participantId, fields: Object.keys(update) });

	return res.status(200).json(await buildView(event));
};

module.exports = organizerController;
