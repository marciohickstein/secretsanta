"use strict"

process.env.TEST = 8;
process.env.NOTIFY_EMAIL = 'false';
process.env.NOTIFY_SMS = 'true';
process.env.SMS_GATEWAY_WEBHOOK_KEY = 'chave-de-teste';

jest.mock('../utils/smsSender', () => {
	let counter = 0;
	const actual = jest.requireActual('../utils/smsSender');
	return {
		toE164Brazil: actual.toE164Brazil,
		send: jest.fn(async (to) => (actual.toE164Brazil(to) ? { id: `sms-${++counter}`, state: 'Pending' } : { error: 'Número de celular inválido (informe DDD + número).' })),
		// Por padrao o celular do gateway ainda nao enviou
		getStatus: jest.fn(async () => ({ state: 'Pending' })),
	};
});

require('module-alias/register');
const crypto = require('crypto');
const app = require('../app');
const request = require('supertest');
const sms = require('../utils/smsSender');
const smsNotifications = require('@services/smsNotificationService');
const ParticipantModel = require('@models/participantModel');

const requestEvent = {
	date: "2026-12-24",
	location: "Casa da Ana",
	amount: 100,
	message: "Feliz Natal!",
	host: { name: "Ana", email: "ana@example.com", celphone: "51984120669" },
	participants: [
		{ name: "Bia", email: "bia@example.com", celphone: "51999990001" },
		{ name: "Caio", email: "caio@example.com" },
	],
};

describe('Rastreamento de SMS', () => {
	let eventId, token, api;

	const view = async () => (await api('get').expect(200)).body;
	const byName = (body, name) => body.participants.find(p => p.name === name);

	beforeAll(async () => {
		const response = await request(app).post('/event').send(requestEvent).expect(201);
		eventId = response.body.id;
		token = new URL(response.body.organizerUrl).searchParams.get('token');

		api = (method, path = '') => request(app)[method](`/event/${eventId}/organizer${path}`).set('X-Admin-Token', token);

		await smsNotifications.idle();
	});

	it('envia ao organizador o SMS com o link do painel e registra o status "na fila"', async () => {
		expect(sms.send).toHaveBeenCalledTimes(1);
		expect(sms.send).toHaveBeenCalledWith('51984120669', 'Amigo Secreto', expect.stringContaining(`/painel.html?event=${eventId}`));

		const body = await view();
		expect(body.smsEnabled).toBe(true);
		expect(byName(body, 'Ana')).toMatchObject({ canResendSms: true, smsStatus: { status: 'queued', kind: 'organizer', sentTo: '51984120669' } });
		expect(byName(body, 'Bia')).toMatchObject({ smsStatus: null, canResendSms: false });
		expect(JSON.stringify(body)).not.toMatch(/smsMessageId/);
	});

	it('no sorteio envia SMS so para quem tem celular', async () => {
		sms.send.mockClear();
		await api('post', '/draw').expect(200);
		await smsNotifications.idle();

		const numbers = sms.send.mock.calls.map(([to]) => to).sort();
		expect(numbers).toEqual(['51984120669', '51999990001']);

		const body = await view();
		expect(byName(body, 'Bia').smsStatus).toMatchObject({ status: 'queued', kind: 'draw' });
		expect(byName(body, 'Caio')).toMatchObject({ smsStatus: null, canResendSms: false });
	});

	it('consulta o gateway e avanca o status sem regredir', async () => {
		const [bia] = await ParticipantModel.find({ email: 'bia@example.com' });

		sms.getStatus.mockImplementation(async () => ({ state: 'Delivered' }));
		await api('get');
		await smsNotifications.idle();
		expect(byName(await view(), 'Bia').smsStatus.status).toBe('delivered');

		// "Sent" atrasado nao volta o status
		await ParticipantModel.update(bia.id, { smsCheckedAt: 0 });
		sms.getStatus.mockImplementation(async () => ({ state: 'Sent' }));
		await api('get');
		await smsNotifications.idle();
		expect((await ParticipantModel.get(bia.id))[0].smsStatus).toBe('delivered');

		// status final nao e consultado de novo
		sms.getStatus.mockClear();
		await api('get');
		await smsNotifications.idle();
		expect(sms.getStatus.mock.calls.map(([id]) => id)).not.toContain(bia.smsMessageId);
	});

	it('registra a falha informada pelo gateway', async () => {
		const [ana] = await ParticipantModel.find({ email: 'ana@example.com' });
		await ParticipantModel.update(ana.id, { smsStatus: 'queued', smsCheckedAt: 0 });

		sms.getStatus.mockImplementation(async () => ({ state: 'Failed', reason: 'Invalid number' }));
		await api('get');
		await smsNotifications.idle();

		const body = await view();
		expect(byName(body, 'Ana').smsStatus).toMatchObject({ status: 'failed', error: 'Invalid number' });
		sms.getStatus.mockImplementation(async () => ({ state: 'Pending' }));
	});

	it('reenvia o SMS com intervalo minimo, sem depender do e-mail', async () => {
		const ana = byName(await view(), 'Ana');

		sms.send.mockClear();
		await api('post', `/participants/${ana.id}/resend`).send({ channel: 'sms' }).expect(200);
		await smsNotifications.idle();

		expect(sms.send).toHaveBeenCalledTimes(1);
		const after = byName(await view(), 'Ana');
		expect(after.smsStatus).toMatchObject({ status: 'queued', kind: 'draw', error: null });
		expect(after.smsResendAvailableAt).toBeGreaterThan(Date.now());

		await api('post', `/participants/${ana.id}/resend`).send({ channel: 'sms' }).expect(429);

		// e-mail desativado neste teste: o reenvio por e-mail continua bloqueado
		await api('post', `/participants/${ana.id}/resend`).expect(409);
	});

	it('nao reenvia SMS para quem nao tem celular', async () => {
		const caio = byName(await view(), 'Caio');
		await api('post', `/participants/${caio.id}/resend`).send({ channel: 'sms' }).expect(400);
	});

	describe('webhook do SMS Gateway', () => {
		const sign = (body, { key = 'chave-de-teste', timestamp = Math.floor(Date.now() / 1000) } = {}) => ({
			'X-Signature': crypto.createHmac('sha256', key).update(`${body}${timestamp}`).digest('hex'),
			'X-Timestamp': String(timestamp),
		});

		const post = (payload, options) => {
			const body = JSON.stringify(payload);
			return request(app).post('/webhooks/sms').set('Content-Type', 'application/json').set(sign(body, options)).send(body);
		};

		const smsEvent = (event, messageId, extra = {}) => ({
			deviceId: 'dev-1', event, id: 'wh-' + crypto.randomUUID(), webhookId: 'hook-1',
			payload: { messageId, recipient: '+5551999990001', ...extra },
		});

		let participant;

		beforeAll(async () => {
			participant = await ParticipantModel.create({
				name: 'Duda', email: 'duda@example.com', celphone: '51999990002',
				smsMessageId: 'sms-webhook', smsStatus: 'queued', smsSentAt: Date.now(),
			});
		});

		const status = async () => (await ParticipantModel.get(participant.id))[0];

		it('recusa assinatura invalida ou antiga', async () => {
			const body = JSON.stringify(smsEvent('sms:delivered', 'sms-webhook'));

			await request(app).post('/webhooks/sms').set('Content-Type', 'application/json').send(body).expect(401);
			await post(smsEvent('sms:delivered', 'sms-webhook'), { key: 'outra' }).expect(401);
			await post(smsEvent('sms:delivered', 'sms-webhook'), { timestamp: Math.floor(Date.now() / 1000) - 3600 }).expect(401);

			expect((await status()).smsStatus).toBe('queued');
		});

		it('aplica enviado, entregue e ignora eventos desconhecidos', async () => {
			await post(smsEvent('sms:sent', 'sms-webhook')).expect(200, { received: true, applied: true });
			expect((await status()).smsStatus).toBe('sent');

			await post(smsEvent('sms:delivered', 'sms-webhook')).expect(200, { received: true, applied: true });
			expect((await status()).smsStatus).toBe('delivered');

			await post(smsEvent('sms:sent', 'sms-webhook')).expect(200, { received: true, applied: false });
			await post(smsEvent('sms:received', 'sms-webhook')).expect(200, { received: true, applied: false });
			await post(smsEvent('sms:delivered', 'nao-existe')).expect(200, { received: true, applied: false });
			expect((await status()).smsStatus).toBe('delivered');
		});

		it('registra a falha com o motivo', async () => {
			await ParticipantModel.update(participant.id, { smsStatus: 'sent' });
			await post(smsEvent('sms:failed', 'sms-webhook', { reason: 'Network error' })).expect(200, { received: true, applied: true });
			expect(await status()).toMatchObject({ smsStatus: 'failed', smsError: 'Network error' });
		});
	});
});
