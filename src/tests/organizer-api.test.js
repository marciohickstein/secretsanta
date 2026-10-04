"use strict"

process.env.TEST = 4;
process.env.NOTIFY_EMAIL = 'true';

jest.mock('../utils/emailSender', () => {
	let counter = 0;
	return {
		send: jest.fn(async (to) => (to.includes('falha') ? { error: 'Endereço recusado' } : { id: `msg-${++counter}` })),
		// Por padrao o Resend ainda nao confirmou a entrega
		getStatus: jest.fn(async () => ({ lastEvent: 'sent' })),
	};
});

require('module-alias/register');
const app = require('../app');
const request = require('supertest');
const email = require('../utils/emailSender');
const notifications = require('@services/notificationService');
const EventModel = require('@models/eventModel');
const ParticipantModel = require('@models/participantModel');

const requestEvent = {
	date: "2026-12-24",
	location: "Casa da Ana",
	amount: 100,
	message: "Feliz Natal!",
	host: { name: "Ana", email: "ana@example.com" },
	participants: [
		{ name: "Bia", email: "bia@example.com" },
		{ name: "Caio", email: "falha@example.com" },
	],
};

describe('Painel do organizador', () => {
	let eventId, token, api;

	beforeAll(async () => {
		const response = await request(app).post('/event').send(requestEvent).expect(201);
		eventId = response.body.id;
		token = new URL(response.body.organizerUrl).searchParams.get('token');

		api = (method, path = '') => request(app)[method](`/event/${eventId}/organizer${path}`).set('X-Admin-Token', token);

		await notifications.idle();
	});

	it('envia ao organizador o e-mail com o link do painel e registra o status', async () => {
		expect(email.send).toHaveBeenCalledWith('ana@example.com', 'Amigo Secreto', expect.stringContaining(`/painel.html?event=${eventId}&amp;token=${token}`));

		const response = await api('get').expect(200);
		const host = response.body.participants[0];

		expect(host).toMatchObject({ name: 'Ana', isHost: true, canResend: true });
		expect(host.emailStatus).toMatchObject({ status: 'sent', kind: 'organizer', sentTo: 'ana@example.com' });
	});

	it('exige o token do organizador', async () => {
		await request(app).get(`/event/${eventId}/organizer`).expect(403);
		await request(app).get(`/event/${eventId}/organizer`).set('X-Admin-Token', 'errado').expect(403);
		await request(app).post(`/event/${eventId}/organizer/draw`).set('X-Admin-Token', 'errado').expect(403);
		await request(app).get(`/event/nao-existe/organizer`).set('X-Admin-Token', token).expect(403);
	});

	it('mostra os participantes sem tokens, pares ou conteudo das listas', async () => {
		const response = await api('get').expect(200);
		const body = JSON.stringify(response.body);

		expect(response.body.event).toMatchObject({ location: 'Casa da Ana', drawn: false });
		expect(response.body.participants).toHaveLength(3);
		expect(body).not.toMatch(/editToken|adminToken|participants_drawn|emailMessageId/);

		const bia = response.body.participants[1];
		expect(bia).toMatchObject({ name: 'Bia', email: 'bia@example.com', emailStatus: null, wishlistItems: null, canResend: false });
	});

	it('mostra se o participante preencheu a lista de presentes', async () => {
		const view = await api('get');
		const bia = view.body.participants[1];
		const [participant] = await ParticipantModel.get(bia.id);

		await request(app)
			.put(`/wishlist/${bia.id}`)
			.set('X-Edit-Token', participant.editToken)
			.send({ wishlist: [{ product: 'Livro' }, { product: 'Caneca' }] })
			.expect(200);

		const response = await api('get');
		expect(response.body.participants[1].wishlistItems).toBe(2);
	});

	it('nao reenvia para participante antes do sorteio e respeita o intervalo do organizador', async () => {
		const view = await api('get');
		const [host, bia] = view.body.participants;

		const toBia = await api('post', `/participants/${bia.id}/resend`).expect(409);
		expect(toBia.body.message).toMatch(/sorteio/);

		await api('post', `/participants/${host.id}/resend`).expect(429);
	});

	it('corrige o e-mail de um participante e recusa e-mail repetido', async () => {
		const view = await api('get');
		const caio = view.body.participants[2];

		await api('patch', `/participants/${caio.id}`).send({ email: 'bia@example.com' }).expect(400);
		await api('patch', `/participants/${caio.id}`).send({ email: 'invalido' }).expect(400);
		await api('patch', `/participants/${caio.id}`).send({ role: 'admin' }).expect(400);

		const response = await api('patch', `/participants/${caio.id}`).send({ name: 'Caio Silva', email: 'falha.caio@example.com' }).expect(200);
		expect(response.body.participants[2]).toMatchObject({ name: 'Caio Silva', email: 'falha.caio@example.com' });
	});

	it('sorteia pelo painel e envia o e-mail de cada participante', async () => {
		email.send.mockClear();

		const response = await api('post', '/draw').expect(200);
		expect(response.body.event.drawn).toBe(true);
		expect(JSON.stringify(response.body)).not.toMatch(/participants_drawn|receiver/);

		await notifications.idle();

		expect(email.send).toHaveBeenCalledTimes(3);
		email.send.mock.calls.forEach(([, , html]) => {
			expect(html).toMatch(/crudWishlist\.html\?idparticipant=[^&]+&amp;token=/);
			expect(html).toContain(`idevent=${eventId}`);
		});

		const view = await api('get');
		const statuses = Object.fromEntries(view.body.participants.map(p => [p.name, p.emailStatus.status]));
		expect(statuses).toEqual({ 'Ana': 'sent', 'Bia': 'sent', 'Caio Silva': 'failed' });
		expect(view.body.participants[2].emailStatus.error).toBe('Endereço recusado');
	});

	it('nao sorteia duas vezes', async () => {
		await api('post', '/draw').expect(409);
	});

	it('reenvia apos falha mesmo dentro do intervalo, mas nao duas vezes seguidas', async () => {
		const view = await api('get');
		const caio = view.body.participants[2];

		await api('patch', `/participants/${caio.id}`).send({ email: 'caio@example.com' }).expect(200);

		email.send.mockClear();
		await api('post', `/participants/${caio.id}/resend`).expect(200);
		await notifications.idle();

		expect(email.send).toHaveBeenCalledTimes(1);
		expect(email.send).toHaveBeenCalledWith('caio@example.com', 'Amigo Secreto', expect.any(String));

		const after = await api('get');
		expect(after.body.participants[2].emailStatus).toMatchObject({ status: 'sent', kind: 'draw' });
		expect(after.body.participants[2].resendAvailableAt).toBeGreaterThan(Date.now());

		await api('post', `/participants/${caio.id}/resend`).expect(429);
	});

	it('o reenvio mantem o mesmo amigo secreto', async () => {
		const [event] = await EventModel.get(eventId);
		const pair = event.participants_drawn.find(p => p.friend !== event.host);
		const [receiver] = await ParticipantModel.get(pair.receiver);

		await ParticipantModel.update(pair.friend, { emailSentAt: 0 });

		email.send.mockClear();
		await api('post', `/participants/${pair.friend}/resend`).expect(200);
		await notifications.idle();

		expect(email.send.mock.calls[0][2]).toContain(receiver.name);
		expect(email.send.mock.calls[0][2]).toContain(`idparticipant=${receiver.id}&amp;idevent=`);
	});

	it('sem webhook, consulta o Resend e contabiliza os e-mails entregues', async () => {
		const [event] = await EventModel.get(eventId);
		const [host] = await ParticipantModel.get(event.host);

		email.getStatus.mockClear();
		email.getStatus.mockImplementation(async (id) => ({ lastEvent: id === host.emailMessageId ? 'bounced' : 'delivered' }));

		// primeira abertura do painel dispara a consulta em segundo plano
		await api('get').expect(200);
		await notifications.idle();

		const pendingIds = email.getStatus.mock.calls.map(([id]) => id);
		expect(pendingIds).toContain(host.emailMessageId);

		const view = await api('get');
		const statuses = Object.fromEntries(view.body.participants.map(p => [p.name, p.emailStatus.status]));

		expect(statuses['Ana']).toBe('bounced');
		expect(view.body.participants[0].emailStatus.error).toMatch(/recusou/);
		expect(Object.values(statuses).filter(s => s === 'delivered').length).toBeGreaterThanOrEqual(1);

		// status final nao e consultado de novo
		email.getStatus.mockClear();
		await notifications.idle();
		await api('get');
		await notifications.idle();
		const again = email.getStatus.mock.calls.map(([id]) => id);
		expect(again).not.toContain(host.emailMessageId);

		email.getStatus.mockImplementation(async () => ({ lastEvent: 'sent' }));
	});

	it('consulta ao Resend nao faz o status regredir', async () => {
		const view = await api('get');
		const delivered = view.body.participants.find(p => p.emailStatus.status === 'delivered');
		const [participant] = await ParticipantModel.get(delivered.id);

		await ParticipantModel.update(participant.id, { emailStatus: 'sent', emailCheckedAt: 0 });
		email.getStatus.mockImplementation(async () => ({ lastEvent: 'opened' }));
		await api('get');
		await notifications.idle();

		email.getStatus.mockImplementation(async () => ({ lastEvent: 'delivered' }));
		await ParticipantModel.update(participant.id, { emailCheckedAt: 0 });
		await api('get');
		await notifications.idle();

		const [after] = await ParticipantModel.get(participant.id);
		expect(after.emailStatus).toBe('opened');
	});

	it('desativa a consulta quando a chave do Resend so permite envio', async () => {
		const [event] = await EventModel.get(eventId);
		const pending = event.participants_drawn.map(p => p.friend);

		for (const id of pending) await ParticipantModel.update(id, { emailStatus: 'sent', emailCheckedAt: 0 });

		email.getStatus.mockClear();
		email.getStatus.mockImplementation(async () => ({ error: 'This API key is restricted to only send emails' }));

		await api('get');
		await notifications.idle();
		expect(email.getStatus).toHaveBeenCalledTimes(1);

		for (const id of pending) await ParticipantModel.update(id, { emailCheckedAt: 0 });
		await api('get');
		await notifications.idle();
		expect(email.getStatus).toHaveBeenCalledTimes(1);
	});
});
