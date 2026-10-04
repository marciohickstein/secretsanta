"use strict"

process.env.TEST = 5;
const SECRET = 'whsec_' + Buffer.from('segredo-de-teste-do-webhook').toString('base64');
process.env.RESEND_WEBHOOK_SECRET = SECRET;

require('module-alias/register');
const crypto = require('crypto');
const request = require('supertest');
const app = require('../app');
const ParticipantModel = require('@models/participantModel');

function sign(body, { secret = SECRET, timestamp = Math.floor(Date.now() / 1000), id = 'msg_' + crypto.randomUUID() } = {}) {
	const key = Buffer.from(secret.replace('whsec_', ''), 'base64');
	const signature = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
	return { 'svix-id': id, 'svix-timestamp': String(timestamp), 'svix-signature': `v1,${signature}` };
}

const send = (payload, options) => {
	const body = JSON.stringify(payload);
	return request(app)
		.post('/webhooks/resend')
		.set('Content-Type', 'application/json')
		.set(sign(body, options))
		.send(body);
};

const event = (type, data = {}) => ({ type, created_at: new Date().toISOString(), data: { email_id: 'email-123', to: ['x@example.com'], ...data } });

describe('Webhook do Resend', () => {
	let participant;

	beforeAll(async () => {
		participant = await ParticipantModel.create({
			name: 'Bia', email: 'bia@example.com',
			emailMessageId: 'email-123', emailStatus: 'sent', emailSentAt: Date.now(),
		});
	});

	const status = async () => (await ParticipantModel.get(participant.id))[0];

	it('recusa assinatura invalida, ausente ou antiga', async () => {
		const body = JSON.stringify(event('email.delivered'));

		await request(app).post('/webhooks/resend').set('Content-Type', 'application/json').send(body).expect(401);
		await request(app).post('/webhooks/resend').set('Content-Type', 'application/json')
			.set(sign(body, { secret: 'whsec_' + Buffer.from('outro').toString('base64') })).send(body).expect(401);
		await send(event('email.delivered'), { timestamp: Math.floor(Date.now() / 1000) - 3600 }).expect(401);

		// corpo alterado depois de assinado
		const headers = sign(body);
		await request(app).post('/webhooks/resend').set('Content-Type', 'application/json').set(headers)
			.send(body.replace('delivered', 'bounced')).expect(401);

		expect((await status()).emailStatus).toBe('sent');
	});

	it('atualiza para entregue', async () => {
		const response = await send(event('email.delivered')).expect(200);
		expect(response.body).toEqual({ received: true, applied: true });
		expect((await status()).emailStatus).toBe('delivered');
	});

	it('ignora evento fora de ordem que voltaria o status', async () => {
		const response = await send(event('email.sent')).expect(200);
		expect(response.body.applied).toBe(false);
		expect((await status()).emailStatus).toBe('delivered');
	});

	it('registra devolucao com a mensagem do servidor de e-mail', async () => {
		await send(event('email.bounced', { bounce: { message: 'Mailbox does not exist', type: 'Permanent' } })).expect(200);

		const current = await status();
		expect(current.emailStatus).toBe('bounced');
		expect(current.emailError).toBe('Mailbox does not exist');

		await send(event('email.opened')).expect(200);
		expect((await status()).emailStatus).toBe('bounced');
	});

	it('ignora e-mails desconhecidos e tipos nao tratados', async () => {
		const unknown = await send(event('email.delivered', { email_id: 'outro' })).expect(200);
		expect(unknown.body.applied).toBe(false);

		const other = await send({ type: 'contact.created', data: {} }).expect(200);
		expect(other.body.applied).toBe(false);
	});
});
