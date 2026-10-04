"use strict"

process.env.TEST = 3;

require('module-alias/register');
const app = require('../app');
const request = require('supertest');
const EventModel = require('@models/eventModel');
const ParticipantModel = require('@models/participantModel');

const host = { name: "Marcio", email: "marcio@example.com", celphone: "51999990000" };
const participants = [
	{ name: "Claudio", email: "claudio@example.com" },
	{ name: "Leo", email: "leo@example.com" },
];

const requestEvent = {
	date: "2021-01-01",
	location: "Casa do Marcio",
	amount: 150,
	message: "Qualquer mensagem para os convidados do amigo secreto",
	host,
	participants,
};

const PUBLIC_FIELDS = ['amount', 'date', 'drawn', 'id', 'location', 'participantsCount'];

describe('API /event', () => {
	let eventId;
	let organizerUrl;

	it('cria um evento e retorna somente dados publicos', async () => {
		const response = await request(app)
			.post('/event')
			.send({ ...requestEvent, id: 'forjado', event_drawn: 1, participants_drawn: [{ friend: 'x' }] })
			.expect('Content-Type', /json/)
			.expect(201);

		expect(Object.keys(response.body).sort()).toEqual([...PUBLIC_FIELDS, 'organizerUrl'].sort());
		expect(response.body.organizerUrl).toMatch(/^http:\/\/localhost:3333\/painel\.html\?event=.+&token=.+$/);
		expect(response.body).toMatchObject({
			date: requestEvent.date,
			location: requestEvent.location,
			amount: requestEvent.amount,
			participantsCount: 3,
			drawn: false,
		});
		expect(response.body.id).not.toBe('forjado');

		eventId = response.body.id;
		organizerUrl = response.body.organizerUrl;
	});

	it('nao grava campos nao permitidos (mass assignment)', async () => {
		const [event] = await EventModel.get(eventId);

		expect(event.event_drawn).toBeUndefined();
		expect(event.participants_drawn).toBeUndefined();
		expect(event.adminToken).toEqual(expect.any(String));
		expect(organizerUrl).toContain(event.adminToken);
	});

	it('retorna o evento sem participantes, tokens ou sorteio', async () => {
		const response = await request(app).get(`/event/${eventId}`).expect(200);

		expect(Object.keys(response.body).sort()).toEqual(PUBLIC_FIELDS);
	});

	it.each([
		['menos de 3 participantes', { participants: [participants[0]] }],
		['e-mail invalido', { host: { ...host, email: 'invalido' } }],
		['e-mails repetidos', { participants: [participants[0], participants[0]] }],
		['mensagem muito longa', { message: 'x'.repeat(1001) }],
		['valor invalido', { amount: 'abc' }],
	])('rejeita evento com %s', async (_, override) => {
		const response = await request(app)
			.post('/event')
			.send({ ...requestEvent, ...override })
			.expect(400);

		expect(response.body.error).toBe(true);
	});

	it('nao expoe listagem nem exclusao de eventos', async () => {
		await request(app).get('/event').expect(404);
		await request(app).delete(`/event/${eventId}`).expect(404);
	});

	it('link antigo de sorteio com token invalido nao leva ao painel', async () => {
		await request(app).get(`/event/${eventId}?draw=true`).expect(404);
		await request(app).get(`/event/${eventId}?draw=errado`).expect(404);
	});

	it('link de sorteio com token valido redireciona para o painel sem sortear', async () => {
		const [event] = await EventModel.get(eventId);

		const response = await request(app).get(`/event/${eventId}?draw=${event.adminToken}`).expect(302);

		expect(response.headers.location).toBe(`http://localhost:3333/painel.html?event=${eventId}&token=${event.adminToken}`);

		const [after] = await EventModel.get(eventId);
		expect(after.event_drawn).toBeUndefined();
	});

	it('evento antigo (sem token) aceita ?draw=true e ganha token do organizador', async () => {
		const legacy = await EventModel.create({ location: 'x', message: 'y', host: 'h', participants: ['a', 'b'] });

		const response = await request(app).get(`/event/${legacy.id}?draw=true`).expect(302);
		const [updated] = await EventModel.get(legacy.id);

		expect(updated.adminToken).toEqual(expect.any(String));
		expect(response.headers.location).toContain(`token=${updated.adminToken}`);

		// depois de ganhar token, ?draw=true deixa de funcionar
		await request(app).get(`/event/${legacy.id}?draw=true`).expect(404);
	});

	it('cria participantes com token de edicao', async () => {
		const [event] = await EventModel.get(eventId);
		const [participant] = await ParticipantModel.get(event.host);

		expect(participant).toMatchObject({ name: host.name, email: host.email });
		expect(participant.editToken).toEqual(expect.any(String));
	});
});
