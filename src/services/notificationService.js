"use strict"

require('module-alias/register');

const config = require('@config');
const ParticipantModel = require('@models/participantModel');
const email = require('@utils/emailSender');
const logger = require('@utils/logger');

// Ordem de evolucao dos status de entrega (um evento atrasado nao "volta" o status)
const STATUS_RANK = { sending: 0, sent: 1, delayed: 2, delivered: 3, opened: 4, clicked: 5 };
const FAILURES = new Set(['failed', 'bounced', 'complained', 'suppressed']);

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

const isFailure = (status) => FAILURES.has(status);

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
	const now = Date.now();

	await ParticipantModel.update(participant.id, {
		emailKind: kind,
		emailStatus: 'sending',
		emailSentTo: to,
		emailSentAt: now,
		emailUpdatedAt: now,
		emailError: null,
		emailMessageId: null,
	});

	return enqueue(async () => {
		const result = await email.send(to, subject, html);

		const patch = result && result.id
			? { emailStatus: 'sent', emailMessageId: result.id, emailUpdatedAt: Date.now() }
			: { emailStatus: 'failed', emailError: (result && result.error) || 'Falha ao enviar e-mail.', emailUpdatedAt: Date.now() };

		// So atualiza se nao houve um novo envio para este participante enquanto este estava na fila
		await ParticipantModel.update(participant.id, patch, { onlyIf: current => current.emailSentAt === now });

		return patch;
	});
}

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

const DEFAULT_ERRORS = {
	bounced: 'O servidor de e-mail do destinatário recusou a mensagem.',
	complained: 'O destinatário marcou o e-mail como spam.',
	suppressed: 'Endereço bloqueado pelo Resend por falhas anteriores.',
	failed: 'O Resend não conseguiu enviar o e-mail.',
};

const PENDING = new Set(['sent', 'delayed']);

// Chaves "Sending access" do Resend nao podem consultar e-mails; nesse caso a consulta e desativada
let statusCheckDisabled = false;

/* Aplica um novo status ao participante, sem regredir (ex.: "sent" atrasado nao sobrescreve "delivered") */
async function applyStatus(participant, messageId, status, error) {
	const current = participant.emailStatus;
	const advances = isFailure(status)
		|| (!isFailure(current) && (STATUS_RANK[status] ?? 0) > (STATUS_RANK[current] ?? -1));

	if (!advances) return false;

	const updated = await ParticipantModel.update(participant.id, {
		emailStatus: status,
		emailError: isFailure(status) ? (error || DEFAULT_ERRORS[status] || null) : null,
		emailUpdatedAt: Date.now(),
	}, { onlyIf: cur => cur.emailMessageId === messageId });

	if (updated) logger.info('Status de e-mail atualizado', { participantId: participant.id, status });

	return Boolean(updated);
}

/* Aplica um evento de webhook do Resend ao participante dono do e-mail */
async function applyEmailEvent(payload) {
	const status = WEBHOOK_STATUS[payload && payload.type];
	const messageId = payload && payload.data && payload.data.email_id;

	if (!status || !messageId) return { applied: false, reason: 'evento ignorado' };

	const [participant] = await ParticipantModel.find({ emailMessageId: messageId });

	if (!participant) return { applied: false, reason: 'e-mail não encontrado' };

	const data = payload.data;
	const error = (data.bounce && data.bounce.message) || (data.failed && data.failed.reason) || null;

	const applied = await applyStatus(participant, messageId, status, error);
	return { applied, status };
}

/*
 * Alternativa ao webhook: consulta no Resend o status dos e-mails ainda "a caminho".
 * Roda em segundo plano pela fila de envio; o painel recebe o resultado na proxima atualizacao.
 */
async function refreshPendingStatuses(participants) {
	if (statusCheckDisabled) return [];

	const now = Date.now();
	const { statusCheckIntervalMs, statusCheckMaxAgeMs } = config.email;

	const pending = participants.filter(p =>
		p.emailMessageId
		&& PENDING.has(p.emailStatus)
		&& now - (p.emailSentAt || 0) < statusCheckMaxAgeMs
		&& now - (p.emailCheckedAt || 0) >= statusCheckIntervalMs);

	const checks = [];

	for (const participant of pending) {
		const messageId = participant.emailMessageId;

		// Marca antes de enfileirar para que atualizacoes simultaneas do painel nao repitam a consulta
		const marked = await ParticipantModel.update(participant.id, { emailCheckedAt: now }, {
			onlyIf: cur => cur.emailMessageId === messageId && now - (cur.emailCheckedAt || 0) >= statusCheckIntervalMs,
		});

		if (!marked) continue;

		checks.push(enqueue(async () => {
			if (statusCheckDisabled) return false;

			const result = await email.getStatus(messageId);

			if (result && result.error && /restricted|permission|not allowed/i.test(result.error)) {
				statusCheckDisabled = true;
				logger.warn('Consulta de status de e-mail desativada: a chave do Resend só permite envio. Configure o webhook (RESEND_WEBHOOK_SECRET) ou use uma chave com acesso total.');
				return false;
			}

			const status = result && API_STATUS[result.lastEvent];

			if (!status) return false;

			const [latest] = await ParticipantModel.get(participant.id);
			return latest ? applyStatus(latest, messageId, status) : false;
		}));
	}

	return Promise.all(checks);
}

/* Status do ultimo e-mail do participante, no formato exibido no painel */
function emailStatusView(participant) {
	if (!participant.emailStatus) return null;

	return {
		status: participant.emailStatus,
		kind: participant.emailKind || null,
		sentTo: participant.emailSentTo || null,
		sentAt: participant.emailSentAt || null,
		updatedAt: participant.emailUpdatedAt || null,
		error: participant.emailError || null,
	};
}

/* Momento a partir do qual o reenvio fica liberado (0 = liberado agora) */
function resendAvailableAt(participant, now = Date.now()) {
	if (!participant.emailSentAt || isFailure(participant.emailStatus)) return 0;
	if (participant.emailSentTo !== participant.email) return 0;

	const availableAt = participant.emailSentAt + config.email.resendCooldownMs;
	return availableAt > now ? availableAt : 0;
}

module.exports = { sendTrackedEmail, applyEmailEvent, refreshPendingStatuses, emailStatusView, resendAvailableAt, idle, isFailure };
