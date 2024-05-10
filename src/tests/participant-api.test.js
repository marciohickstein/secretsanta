"use strict"

process.env.TEST = 1;

require('module-alias/register');
const app = require('../app');
const request = require('supertest');

const PARTICIPANT = {
	id: "100",
	name: 'Marcio de Matos Hickstein',
	email: 'marcio.hickstein@gmail.com'
};

describe('API /participant', function () {
	it('create a participant', function (done) {
		request(app)
			.post('/participant')
			.send(PARTICIPANT)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.then((response) => {
				expect(response.body).toStrictEqual(PARTICIPANT);
				done();
			})
			.catch((error) => {
				done(error);
			})
	});

	it('return a participant', function (done) {
		request(app)
			.get(`/participant/${PARTICIPANT.id}`)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.then((response) => {
				expect(response.body[0]).toStrictEqual(PARTICIPANT);
				done();
			})
			.catch((error) => {
				done(error);
			})
	});

	it('delete a participant', function (done) {
		request(app)
			.delete(`/participant/${PARTICIPANT.id}`)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.then((response) => {
				expect(response.body).toStrictEqual(PARTICIPANT);
				done();
			})
			.catch((error) => {
				done(error);
			})
	});
});

