"use strict"

require('module-alias/register');

const ParticipantModel = require('@models/participantModel');
const logger = require('@utils/logger');

/*
 * Rastreamento de entrega comum ao e-mail (notificationService) e ao SMS (smsNotificationService).
 * Cada canal grava os mesmos campos no participante, com o seu prefixo:
 *   <prefix>Status, Kind, SentTo, SentAt, UpdatedAt, Error, MessageId e CheckedAt
 * (ex.: emailStatus, smsMessageId). Os nomes sao usados nos dados ja gravados e nos indices: nao mudar.
 *
 * Ficam em cada canal: as filas de envio, a chamada ao provedor, o mapeamento dos status
 * do provedor e a leitura dos webhooks.
 *
 * options:
 *   prefix, label                  'email' / 'e-mail', 'sms' / 'SMS'
 *   statusRank                     ordem de evolucao dos status (um status atrasado nao "volta")
 *   failures, pending              Sets de status de falha e de status ainda "a caminho"
 *   defaultErrors                  mensagem por status de falha, quando o provedor nao informa o motivo
 *   settings                       statusCheckIntervalMs, statusCheckMaxAgeMs e resendCooldownMs do canal
 *   recipientOf, sameRecipient     destino atual do participante e como comparar com o destino do envio
 *   ignoreRepeatedFailure          true: uma falha nao sobrescreve outra falha (SMS)
 */
function createDeliveryTracker(options) {
	const { prefix, label, statusRank, failures, pending, defaultErrors, settings, recipientOf, sameRecipient } = options;
	const ignoreRepeatedFailure = Boolean(options.ignoreRepeatedFailure);

	const F = {
		status: `${prefix}Status`,
		kind: `${prefix}Kind`,
		sentTo: `${prefix}SentTo`,
		sentAt: `${prefix}SentAt`,
		updatedAt: `${prefix}UpdatedAt`,
		error: `${prefix}Error`,
		messageId: `${prefix}MessageId`,
		checkedAt: `${prefix}CheckedAt`,
	};

	const isFailure = (status) => failures.has(status);

	/*
	 * Registra o inicio de um envio e retorna o seu horario (identifica este envio).
	 * A gravacao acontece ja na chamada, antes de qualquer await: o painel mostra "enviando" na hora.
	 */
	async function startSend(participant, kind, to) {
		const now = Date.now();

		await ParticipantModel.update(participant.id, {
			[F.kind]: kind,
			[F.status]: 'sending',
			[F.sentTo]: to,
			[F.sentAt]: now,
			[F.updatedAt]: now,
			[F.error]: null,
			[F.messageId]: null,
		});

		return now;
	}

	/* Grava o resultado do envio ({ status, messageId?, error? }) e retorna o que foi gravado */
	async function finishSend(participantId, sentAt, { status, messageId = null, error = null }) {
		const patch = { [F.status]: status, [F.messageId]: messageId, [F.error]: error, [F.updatedAt]: Date.now() };

		// So atualiza se nao houve um novo envio para este participante enquanto este estava na fila
		await ParticipantModel.update(participantId, patch, { onlyIf: current => current[F.sentAt] === sentAt });

		return patch;
	}

	/* Aplica um novo status ao participante, sem regredir (ex.: "sent" atrasado nao sobrescreve "delivered") */
	async function applyStatus(participant, messageId, status, error) {
		const current = participant[F.status];
		// Falha sempre avanca; os demais so avancam na ordem de statusRank (status desconhecido vale 0)
		const advances = isFailure(status)
			|| (!isFailure(current) && (statusRank[status] ?? 0) > (statusRank[current] ?? -1));

		if (!advances) return false;
		if (ignoreRepeatedFailure && isFailure(status) && isFailure(current)) return false;

		const updated = await ParticipantModel.update(participant.id, {
			[F.status]: status,
			[F.error]: isFailure(status) ? (error || defaultErrors[status] || null) : null,
			[F.updatedAt]: Date.now(),
		}, { onlyIf: cur => cur[F.messageId] === messageId });

		if (updated) logger.info(`Status de ${label} atualizado`, { participantId: participant.id, status });

		return Boolean(updated);
	}

	/* Aplica um evento de webhook (ja traduzido pelo canal) ao participante dono da mensagem */
	async function applyEvent(status, messageId, error) {
		if (!status || !messageId) return { applied: false, reason: 'evento ignorado' };

		const [participant] = await ParticipantModel.find({ [F.messageId]: messageId });

		if (!participant) return { applied: false, reason: `${label} não encontrado` };

		const applied = await applyStatus(participant, messageId, status, error || null);
		return { applied, status };
	}

	/*
	 * Alternativa ao webhook: consulta no provedor o status das mensagens ainda "a caminho".
	 * enqueue: fila onde as consultas rodam; check(messageId): retorna { status, error? } ou null.
	 */
	async function refreshPending(participants, { enqueue, check }) {
		const now = Date.now();
		const { statusCheckIntervalMs, statusCheckMaxAgeMs } = settings;

		const due = participants.filter(p =>
			p[F.messageId]
			&& pending.has(p[F.status])
			&& now - (p[F.sentAt] || 0) < statusCheckMaxAgeMs
			&& now - (p[F.checkedAt] || 0) >= statusCheckIntervalMs);

		const checks = [];

		for (const participant of due) {
			const messageId = participant[F.messageId];

			// Marca antes de enfileirar para que atualizacoes simultaneas do painel nao repitam a consulta
			const marked = await ParticipantModel.update(participant.id, { [F.checkedAt]: now }, {
				onlyIf: cur => cur[F.messageId] === messageId && now - (cur[F.checkedAt] || 0) >= statusCheckIntervalMs,
			});

			if (!marked) continue;

			checks.push(enqueue(async () => {
				const result = await check(messageId);

				if (!result || !result.status) return false;

				const [latest] = await ParticipantModel.get(participant.id);
				return latest ? applyStatus(latest, messageId, result.status, result.error) : false;
			}));
		}

		return Promise.all(checks);
	}

	/* Status da ultima mensagem do participante, no formato exibido no painel */
	function statusView(participant) {
		if (!participant[F.status]) return null;

		return {
			status: participant[F.status],
			kind: participant[F.kind] || null,
			sentTo: participant[F.sentTo] || null,
			sentAt: participant[F.sentAt] || null,
			updatedAt: participant[F.updatedAt] || null,
			error: participant[F.error] || null,
		};
	}

	/* Momento a partir do qual o reenvio fica liberado (0 = liberado agora) */
	function resendAvailableAt(participant, now = Date.now()) {
		if (!participant[F.sentAt] || isFailure(participant[F.status])) return 0;
		// Destino corrigido desde o ultimo envio: pode reenviar na hora
		if (!sameRecipient(participant[F.sentTo], recipientOf(participant))) return 0;

		const availableAt = participant[F.sentAt] + settings.resendCooldownMs;
		return availableAt > now ? availableAt : 0;
	}

	return { isFailure, startSend, finishSend, applyStatus, applyEvent, refreshPending, statusView, resendAvailableAt };
}

module.exports = { createDeliveryTracker };
