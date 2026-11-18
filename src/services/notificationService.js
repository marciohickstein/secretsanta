"use strict"

require('module-alias/register');

const config = require('@config');
const email = require('@utils/emailSender');
const logger = require('@utils/logger');
const { createDeliveryTracker } = require('./deliveryTracker');

/*
 * Rastreamento de e-mail (Resend). O que e comum com o SMS esta em deliveryTracker.js.
 * sending -> sent -> delayed -> delivered -> opened -> clicked
 * Falhas: failed, bounced, complained, suppressed (com o motivo em emailError)
 */
const STATUS_RANK = { sending: 0, sent: 1, delayed: 2, delivered: 3, opened: 4, clicked: 5 };
const FAILURES = new Set(['failed', 'bounced', 'complained', 'suppressed']);
const PENDING = new Set(['sent', 'delayed']);

const DEFAULT_ERRORS = {
	bounced: 'O servidor de e-mail do destinatário recusou a mensagem.',
	complained: 'O destinatário marcou o e-mail como spam.',
	suppressed: 'Endereço bloqueado pelo Resend por falhas anteriores.',
	failed: 'O Resend não conseguiu enviar o e-mail.',
};

// Eventos de webhook do Resend -> status do painel
const WEBHOOK_STATUS = {
	'email.sent': 'sent',
	'email.delivery_delayed': 'delayed',
	'email.delivered': 'delivered',
	'email.opened': 'opened',
	'email.clicked': 'clicked',
	'email.bounced': 'bounced',
	'email.complained': 'complained',
	'email.failed': 'failed',
	'email.suppressed': 'suppressed',
};

// Ultimo evento retornado pela API do Resend (emails.get) -> status do painel
const API_STATUS = {
	sent: 'sent',
	delivery_delayed: 'delayed',
	delivered: 'delivered',
	opened: 'opened',
	clicked: 'clicked',
	bounced: 'bounced',
	complained: 'complained',
	failed: 'failed',
	suppressed: 'suppressed',
	canceled: 'failed',
};

const tracker = createDeliveryTracker({
	prefix: 'email',
	label: 'e-mail',
	statusRank: STATUS_RANK,
	failures: FAILURES,
	pending: PENDING,
	defaultErrors: DEFAULT_ERRORS,
	settings: config.email,
	recipientOf: (participant) => participant.email,
	sameRecipient: (a, b) => a === b,
});

// Fila sequencial de envio, respeitando o limite de requisicoes por segundo do Resend
let queue = Promise.resolve();
let lastSendAt = 0;

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function enqueue(task) {
	const run = queue.then(async () => {
		const delay = lastSendAt + config.email.minIntervalMs - Date.now();
		if (delay > 0) await wait(delay);
		lastSendAt = Date.now();
		return task();
	});

	queue = run.catch(() => {});
	return run;
}

/* Resolve quando todos os envios pendentes terminarem */
const idle = () => queue;

/*
 * Envia um e-mail e registra o status no participante.
 * kind: 'organizer' (link do painel) ou 'draw' (resultado do sorteio)
 */
async function sendTrackedEmail(participant, kind, subject, html) {
	const to = participant.email;
	const sentAt = await tracker.startSend(participant, kind, to);

	return enqueue(async () => {
		const result = await email.send(to, subject, html);

		return tracker.finishSend(participant.id, sentAt, result && result.id
			? { status: 'sent', messageId: result.id }
			: { status: 'failed', error: (result && result.error) || 'Falha ao enviar e-mail.' });
	});
}

/* Aplica um evento de webhook do Resend ao participante dono do e-mail */
async function applyEmailEvent(payload) {
	const data = (payload && payload.data) || {};
	const error = (data.bounce && data.bounce.message) || (data.failed && data.failed.reason) || null;

	return tracker.applyEvent(WEBHOOK_STATUS[payload && payload.type], data.email_id, error);
}

// Chaves "Sending access" do Resend nao podem consultar e-mails; nesse caso a consulta e desativada
let statusCheckDisabled = false;

/*
 * Alternativa ao webhook: consulta no Resend o status dos e-mails ainda "a caminho".
 * Roda em segundo plano pela fila de envio; o painel recebe o resultado na proxima atualizacao.
 */
async function refreshPendingStatuses(participants) {
	if (statusCheckDisabled) return [];

	return tracker.refreshPending(participants, {
		enqueue,
		check: async (messageId) => {
			if (statusCheckDisabled) return null;

			const result = await email.getStatus(messageId);

			if (result && result.error && /restricted|permission|not allowed/i.test(result.error)) {
				statusCheckDisabled = true;
				logger.warn('Consulta de status de e-mail desativada: a chave do Resend só permite envio. Configure o webhook (RESEND_WEBHOOK_SECRET) ou use uma chave com acesso total.');
				return null;
			}

			return { status: result && API_STATUS[result.lastEvent] };
		},
	});
}

module.exports = {
	sendTrackedEmail,
	applyEmailEvent,
	refreshPendingStatuses,
	emailStatusView: tracker.statusView,
	resendAvailableAt: tracker.resendAvailableAt,
	idle,
	isFailure: tracker.isFailure,
};
