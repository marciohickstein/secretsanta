"use strict"

require('module-alias/register');

const config = require('@config');
const sms = require('@utils/smsSender');
const { createDeliveryTracker } = require('./deliveryTracker');

/*
 * Rastreamento de SMS (SMS Gateway for Android). O que e comum com o e-mail esta em deliveryTracker.js.
 * sending -> queued (na fila do celular do gateway) -> sent (aceito pela operadora) -> delivered
 * Falha: failed (com o motivo em smsError)
 */
const STATUS_RANK = { sending: 0, queued: 1, sent: 2, delivered: 3 };
const FAILURES = new Set(['failed']);
const PENDING = new Set(['queued', 'sent']);

const DEFAULT_ERRORS = {
	failed: 'O celular do SMS Gateway não conseguiu enviar o SMS.',
};

// Estado do SMS Gateway (API ou retorno do envio) -> status do painel
const GATEWAY_STATUS = {
	Pending: 'queued',
	Processed: 'sent',
	Sent: 'sent',
	Delivered: 'delivered',
	Failed: 'failed',
	Cancelling: 'failed',
	Cancelled: 'failed',
};

// Eventos de webhook do SMS Gateway (enviados pelo proprio celular)
const WEBHOOK_STATUS = {
	'sms:sent': 'sent',
	'sms:delivered': 'delivered',
	'sms:failed': 'failed',
	'sms:cancelled': 'failed',
};

// Celular sem o DDI 55: 5551988880000 e 51988880000 sao o mesmo numero
const numberKey = (number) => String(number || '').replace(/\D/g, '').replace(/^55(?=\d{11}$)/, '');

const tracker = createDeliveryTracker({
	prefix: 'sms',
	label: 'SMS',
	statusRank: STATUS_RANK,
	failures: FAILURES,
	pending: PENDING,
	defaultErrors: DEFAULT_ERRORS,
	settings: config.sms,
	recipientOf: (participant) => participant.celphone,
	sameRecipient: (a, b) => numberKey(a) === numberKey(b),
	ignoreRepeatedFailure: true,
});

// Fila sequencial para as consultas de status ao gateway
let queue = Promise.resolve();

function enqueue(task) {
	const run = queue.then(task);
	queue = run.catch(() => {});
	return run;
}

/*
 * Envios: uma fila por numero de celular. SMS seguidos para o mesmo numero
 * (ex.: participantes que compartilham o celular) aguardam config.sms.sameNumberIntervalMs,
 * porque a operadora costuma recusar mensagens em sequencia; numeros diferentes nao esperam.
 */
const numberQueues = new Map();
const inFlight = new Set();

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function enqueueForNumber(number, task) {
	const key = numberKey(number);
	const entry = numberQueues.get(key) || { chain: Promise.resolve(), lastSendAt: 0 };

	const run = entry.chain.then(async () => {
		const delay = entry.lastSendAt + config.sms.sameNumberIntervalMs - Date.now();
		if (entry.lastSendAt && delay > 0) await wait(delay);
		entry.lastSendAt = Date.now();
		return task();
	});

	entry.chain = run.catch(() => {});
	numberQueues.set(key, entry);

	const tracked = entry.chain.finally(() => {
		inFlight.delete(tracked);
		// Libera a memoria quando o numero fica ocioso por mais que o intervalo
		setTimeout(() => {
			const current = numberQueues.get(key);
			if (current === entry && Date.now() - entry.lastSendAt >= config.sms.sameNumberIntervalMs) numberQueues.delete(key);
		}, config.sms.sameNumberIntervalMs).unref?.();
	});
	inFlight.add(tracked);

	return run;
}

/* Resolve quando todos os envios e consultas pendentes terminarem */
async function idle() {
	while (inFlight.size) await Promise.all([...inFlight]);
	await queue;
}

/* Resultado do envio ao gateway -> { status, messageId?, error? } */
function sendOutcome(result) {
	if (!result || result.error) return { status: 'failed', error: (result && result.error) || 'Falha ao enviar SMS.' };

	// Aceito, mas sem id para acompanhar: fica como enviado
	if (!result.id) return { status: 'sent' };

	const status = GATEWAY_STATUS[result.state] || 'queued';
	return { status, messageId: result.id, error: tracker.isFailure(status) ? DEFAULT_ERRORS.failed : null };
}

/*
 * Envia um SMS e registra o status no participante.
 * kind: 'organizer' (link do painel) ou 'draw' (resultado do sorteio)
 */
async function sendTrackedSms(participant, kind, subject, text) {
	const to = participant.celphone || '';
	const sentAt = await tracker.startSend(participant, kind, to);

	return enqueueForNumber(to, async () => {
		const result = await sms.send(to, subject, text);
		return tracker.finishSend(participant.id, sentAt, sendOutcome(result));
	});
}

/* Aplica um evento de webhook do SMS Gateway ao participante dono do SMS */
async function applySmsEvent(payload) {
	const data = (payload && payload.payload) || {};
	return tracker.applyEvent(WEBHOOK_STATUS[payload && payload.event], data.messageId, data.reason);
}

/*
 * Consulta no SMS Gateway o status dos SMS ainda "a caminho" (dispensa o webhook).
 * Roda em segundo plano; o painel recebe o resultado na proxima atualizacao.
 */
async function refreshPendingStatuses(participants) {
	return tracker.refreshPending(participants, {
		enqueue,
		check: async (messageId) => {
			const result = await sms.getStatus(messageId);
			return result && { status: GATEWAY_STATUS[result.state] || null, error: result.reason };
		},
	});
}

module.exports = {
	sendTrackedSms,
	applySmsEvent,
	refreshPendingStatuses,
	smsStatusView: tracker.statusView,
	resendAvailableAt: tracker.resendAvailableAt,
	idle,
	isFailure: tracker.isFailure,
};
