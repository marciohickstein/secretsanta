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

	it('cria um evento e retorna somente dados publicos', async () => {
		const response = await request(app)
			.post('/event')
			.send({ ...requestEvent, id: 'forjado', event_drawn: 1, participants_drawn: [{ friend: 'x' }] })
			.expect('Content-Type', /json/)
			.expect(201);

		expect(Object.keys(response.body).sort()).toEqual(PUBLIC_FIELDS);
		expect(response.body).toMatchObject({
			date: requestEvent.date,
			location: requestEvent.location,
			amount: requestEvent.amount,
			participantsCount: 3,
			drawn: false,
		});
		expect(response.body.id).not.toBe('forjado');

		eventId = response.body.id;
	});

	it('nao grava campos nao permitidos (mass assignment)', async () => {
		const [event] = await EventModel.get(eventId);

		expect(event.event_drawn).toBeUndefined();
		expect(event.participants_drawn).toBeUndefined();
		expect(event.drawToken).toEqual(expect.any(String));
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

	it('nao sorteia com token invalido', async () => {
		await request(app).get(`/event/${eventId}?draw=true`).expect(404);
		await request(app).get(`/event/${eventId}?draw=errado`).expect(404);

		const [event] = await EventModel.get(eventId);
		expect(event.event_drawn).toBeUndefined();
	});

	it('sorteia com o token correto e guarda apenas os ids dos pares', async () => {
		const [event] = await EventModel.get(eventId);

		await request(app).get(`/event/${eventId}?draw=${event.drawToken}`).expect(200);

		const [drawn] = await EventModel.get(eventId);
		const ids = [drawn.host, ...drawn.participants].sort();

		expect(drawn.event_drawn).toEqual(expect.any(Number));
		expect(drawn.participants_drawn).toHaveLength(3);
		drawn.participants_drawn.forEach(pair => {
			expect(Object.keys(pair).sort()).toEqual(['friend', 'receiver']);
			expect(pair.friend).not.toBe(pair.receiver);
		});
		expect(drawn.participants_drawn.map(p => p.friend).sort()).toEqual(ids);
		expect(drawn.participants_drawn.map(p => p.receiver).sort()).toEqual(ids);

		const response = await request(app).get(`/event/${eventId}`).expect(200);
		expect(response.body.drawn).toBe(true);
		expect(response.body.participants_drawn).toBeUndefined();
	});

	it('nao sorteia duas vezes', async () => {
		const [event] = await EventModel.get(eventId);
		const before = event.participants_drawn;

		await request(app).get(`/event/${eventId}?draw=${event.drawToken}`).expect(200);

		const [after] = await EventModel.get(eventId);
		expect(after.participants_drawn).toEqual(before);
	});

	it('cria participantes com token de edicao', async () => {
		const [event] = await EventModel.get(eventId);
		const [participant] = await ParticipantModel.get(event.host);

		expect(participant).toMatchObject({ name: host.name, email: host.email });
		expect(participant.editToken).toEqual(expect.any(String));
	});
});
