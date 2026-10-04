"use strict"

process.env.TEST = 1;

require('module-alias/register');
const app = require('../app');
const request = require('supertest');
const ParticipantModel = require('@models/participantModel');

describe('API /participant', () => {
	let participant;

	beforeAll(async () => {
		participant = await ParticipantModel.create({
			name: 'Marcio de Matos Hickstein',
			email: 'marcio@example.com',
			celphone: '51999990000',
			editToken: 'segredo',
		});
	});

	it('retorna apenas id e nome do participante', async () => {
		const response = await request(app)
			.get(`/participant/${participant.id}`)
			.expect('Content-Type', /json/)
			.expect(200);

		expect(response.body).toStrictEqual({ id: participant.id, name: participant.name });
	});

	it('retorna 404 para participante inexistente', async () => {
		await request(app).get('/participant/nao-existe').expect(404);
	});

	it('nao expoe listagem, criacao nem exclusao de participantes', async () => {
		await request(app).get('/participant').expect(404);
		await request(app).post('/participant').send({ name: 'x' }).expect(404);
		await request(app).delete(`/participant/${participant.id}`).expect(404);
	});
});
