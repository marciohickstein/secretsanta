"use strict"

require('module-alias/register');

const config = require('@config');
const ParticipantModel = require('@models/participantModel');
const sms = require('@utils/smsSender');
const logger = require('@utils/logger');

/*
 * Rastreamento de SMS, no mesmo modelo do e-mail (notificationService):
 * sending -> queued (na fila do celular do gateway) -> sent (aceito pela operadora) -> delivered
 * Falha: failed (com o motivo em smsError)
 */
const STATUS_RANK = { sending: 0, queued: 1, sent: 2, delivered: 3 };
const FAILURES = new Set(['failed']);
const PENDING = new Set(['queued', 'sent']);

const isFailure = (status) => FAILURES.has(status);

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

const DEFAULT_ERRORS = {
	failed: 'O celular do SMS Gateway não conseguiu enviar o SMS.',
};

// Fila sequencial: um envio/consulta por vez ao gateway
let queue = Promise.resolve();

function enqueue(task) {
	const run = queue.then(task);
	queue = run.catch(() => {});
	return run;
}

/* Resolve quando todos os envios e consultas pendentes terminarem */
const idle = () => queue;

const statusOf = (state) => GATEWAY_STATUS[state] || null;

/*
 * Envia um SMS e registra o status no participante.
 * kind: 'organizer' (link do painel) ou 'draw' (resultado do sorteio)
 */
async function sendTrackedSms(participant, kind, subject, text) {
	const to = participant.celphone || '';
	const now = Date.now();

	await ParticipantModel.update(participant.id, {
		smsKind: kind,
		smsStatus: 'sending',
		smsSentTo: to,
		smsSentAt: now,
		smsUpdatedAt: now,
		smsError: null,
		smsMessageId: null,
	});

	return enqueue(async () => {
		const result = await sms.send(to, subject, text);
		const accepted = Boolean(result) && !result.error;

		let patch;

		if (!accepted) {
			patch = { smsStatus: 'failed', smsError: (result && result.error) || 'Falha ao enviar SMS.', smsUpdatedAt: Date.now() };
		} else if (!result.id) {
			// Aceito, mas sem id para acompanhar: fica como enviado
			patch = { smsStatus: 'sent', smsMessageId: null, smsError: null, smsUpdatedAt: Date.now() };
		} else {
			const status = statusOf(result.state) || 'queued';
			patch = { smsStatus: status, smsMessageId: result.id, smsError: isFailure(status) ? DEFAULT_ERRORS.failed : null, smsUpdatedAt: Date.now() };
		}

		// So atualiza se nao houve um novo envio para este participante enquanto este estava na fila
		await ParticipantModel.update(participant.id, patch, { onlyIf: current => current.smsSentAt === now });

		return patch;
	});
}

/* Aplica um novo status ao participante, sem regredir (ex.: "sent" atrasado nao sobrescreve "delivered") */
async function applyStatus(participant, messageId, status, error) {
	const current = participant.smsStatus;
	const advances = isFailure(status)
		|| (!isFailure(current) && (STATUS_RANK[status] ?? 0) > (STATUS_RANK[current] ?? -1));

	if (!advances || (isFailure(status) && isFailure(current))) return false;

	const updated = await ParticipantModel.update(participant.id, {
		smsStatus: status,
		smsError: isFailure(status) ? (error || DEFAULT_ERRORS[status] || null) : null,
		smsUpdatedAt: Date.now(),
	}, { onlyIf: cur => cur.smsMessageId === messageId });

	if (updated) logger.info('Status de SMS atualizado', { participantId: participant.id, status });

	return Boolean(updated);
}

/* Aplica um evento de webhook do SMS Gateway ao participante dono do SMS */
async function applySmsEvent(payload) {
	const status = WEBHOOK_STATUS[payload && payload.event];
	const data = (payload && payload.payload) || {};
	const messageId = data.messageId;

	if (!status || !messageId) return { applied: false, reason: 'evento ignorado' };

	const [participant] = await ParticipantModel.find({ smsMessageId: messageId });

	if (!participant) return { applied: false, reason: 'SMS não encontrado' };

	const applied = await applyStatus(participant, messageId, status, data.reason || null);
	return { applied, status };
}

/*
 * Consulta no SMS Gateway o status dos SMS ainda "a caminho" (dispensa o webhook).
 * Roda em segundo plano; o painel recebe o resultado na proxima atualizacao.
 */
async function refreshPendingStatuses(participants) {
	const now = Date.now();
	const { statusCheckIntervalMs, statusCheckMaxAgeMs } = config.sms;

	const pending = participants.filter(p =>
		p.smsMessageId
		&& PENDING.has(p.smsStatus)
		&& now - (p.smsSentAt || 0) < statusCheckMaxAgeMs
		&& now - (p.smsCheckedAt || 0) >= statusCheckIntervalMs);

	const checks = [];

	for (const participant of pending) {
		const messageId = participant.smsMessageId;

		// Marca antes de enfileirar para que atualizacoes simultaneas do painel nao repitam a consulta
		const marked = await ParticipantModel.update(participant.id, { smsCheckedAt: now }, {
			onlyIf: cur => cur.smsMessageId === messageId && now - (cur.smsCheckedAt || 0) >= statusCheckIntervalMs,
		});

		if (!marked) continue;

		checks.push(enqueue(async () => {
			const result = await sms.getStatus(messageId);
			const status = result && statusOf(result.state);

			if (!status) return false;

			const [latest] = await ParticipantModel.get(participant.id);
			return latest ? applyStatus(latest, messageId, status, result.reason) : false;
		}));
	}

	return Promise.all(checks);
}

/* Status do ultimo SMS do participante, no formato exibido no painel */
function smsStatusView(participant) {
	if (!participant.smsStatus) return null;

	return {
		status: participant.smsStatus,
		kind: participant.smsKind || null,
		sentTo: participant.smsSentTo || null,
		sentAt: participant.smsSentAt || null,
		updatedAt: participant.smsUpdatedAt || null,
		error: participant.smsError || null,
	};
}

const sameNumber = (a, b) => String(a || '').replace(/\D/g, '') === String(b || '').replace(/\D/g, '');

/* Momento a partir do qual o reenvio do SMS fica liberado (0 = liberado agora) */
function resendAvailableAt(participant, now = Date.now()) {
	if (!participant.smsSentAt || isFailure(participant.smsStatus)) return 0;
	if (!sameNumber(participant.smsSentTo, participant.celphone)) return 0;

	const availableAt = participant.smsSentAt + config.sms.resendCooldownMs;
	return availableAt > now ? availableAt : 0;
}

module.exports = { sendTrackedSms, applySmsEvent, refreshPendingStatuses, smsStatusView, resendAvailableAt, idle, isFailure };
