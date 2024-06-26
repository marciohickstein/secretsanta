"use strict"

process.env.TEST = 2;

require('module-alias/register');
const request = require('supertest');
const app = require('@app');


const participant = {
	id: "10",
	name: "Marcio",
	email: "marcio.hickstein@gmail.com"
}

const dataToTest = { 
	id: "10", // ID participant
	wishlist: [
		{
			gift: "iphone",
			infoExtra: "Pode ser o mais baratinho ;)"
		},
		{
			gift: "ipad",
			infoExtra: "Tem que ser o ultimo, hahahaha..."
		}
	]
};

describe(`API /wishlist`, () => {

	beforeAll((done) => {
		// Create a participant to test wishlist
		request(app)
			.post(`/participant/`)
			.send(participant)
		.expect(200)
		.then((response) => {
			expect(response.body).toStrictEqual(participant);
			done();
		})
		.catch((error) => {
			done(error);
		})
	});
	
	
	it(`Create a wishlist`, (done) => {
		request(app)
		.post('/wishlist')
		.send(dataToTest)
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(200)
		.then((response) => {
			expect(response.body).toStrictEqual(dataToTest);
			done();
		})
		.catch((error) => {
			done(error);
		})
	});

	it(`Obtem a wishlist specific`, (done) => {
		request(app)
		.get(`/wishlist/${dataToTest.id}`)
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(200)
		.then((response) => {
			expect(response.body[0]).toStrictEqual(dataToTest);
			done();
		})
		.catch((error) => {
			done(error);
		})
	});

	it(`Remove a wishlist specific`, (done) => {
		request(app)
		.delete(`/wishlist/${dataToTest.id}`)
		.set('Accept', 'application/json')
		.expect('Content-Type', /json/)
		.expect(200)
		.then((response) => {
			expect(response.body).toStrictEqual(dataToTest);
			done();
		})
		.catch((error) => {
			done(error);
		})
	});

	afterAll(async () => {
		// Create a participant to test wishlist
		const response = await request(app)
			.delete(`/participant/${participant.id}`)
			.send({});
		expect(response.res.statusCode).toBe(200);
	});
});


