"use strict"

process.env.TEST = 3;

require('module-alias/register');
const app = require('../app');
const request = require('supertest');
const util = require('../utils/util');


jest.mock('../utils/util', () => {
	const originalModule = jest.requireActual('../utils/util');

	//Mock the default export and named export 'foo'
	return {
		__esModule: true,
		...originalModule,
		sendEmail: jest.fn(() => true),
	};
});

const participants = [
	{
		id: "1",
		name: "Marcio",
		email: "marcio.hickstein@gmail.com"
	},
	{
		id: "2",
		name: "Claudio",
		email: "hicky.kt@gmail.com"
	},
	{
		id: "3",
		name: "Leo",
		email: "hicky_kitten@yahoo.com"
	}
];

const requestEvent = {
	id: "1",
	date: "2021-01-01",
	location: "Casa do Marcio",
	amount: 150,
	host: participants[0],
	message: "Qualquer mensagem para os convidados do amigo secreto",
	participants: participants.slice(1),
}

const eventToCompare = {
	id: "1",
	date: "2021-01-01",
	location: "Casa do Marcio",
	amount: 150,
	message: "Qualquer mensagem para os convidados do amigo secreto",
}

describe('API /event', function () {
	it('create a event', function (done) {
		request(app)
			.post('/event')
			.send(requestEvent)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.then((response) => {
				const responseEvent = response.body;
				delete responseEvent.host;
				delete responseEvent.participants;
				expect(response.body).toStrictEqual(eventToCompare);
				done();
			})
			.catch((error) => {
				done(error);
			})
	});

	it('return all event', function (done) {
		request(app)
			.get(`/event/${requestEvent.id}`)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.then((response) => {
				const responseEvent = response.body[0];
				delete responseEvent.host;
				delete responseEvent.participants;
				expect(responseEvent).toStrictEqual(eventToCompare);
				done();
			})
			.catch((error) => {
				done(error);
			})
	});

	it('delete a event', function (done) {
		request(app)
			.delete(`/event/${requestEvent.id}`)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.then((response) => {
				const responseEvent = response.body;
				delete responseEvent.host;
				delete responseEvent.participants;
				expect(responseEvent).toStrictEqual(eventToCompare);
				done();
			})
			.catch((error) => {
				done(error);
			})
	});

	afterAll(async () => {
		// Remove all list of participants before test of events
		for (const participant of participants) {
			const response = await request(app)
				.delete(`/participant/${participant.id}`)
				.send(participant);
			expect(response.res.statusCode).toBe(200);
		}
	});

});


