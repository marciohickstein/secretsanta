"use strict"

process.env.TEST = 2;

require('module-alias/register');
const request = require('supertest');
const app = require('@app');
const ParticipantModel = require('@models/participantModel');

const wishlist = [
	{ product: "iphone", price: "5000", infoExtra: "Pode ser o mais baratinho ;)" },
	{ product: "ipad", price: 3000, infoExtra: "Tem que ser o ultimo, hahahaha..." },
];

describe(`API /wishlist`, () => {
	let participant;

	beforeAll(async () => {
		participant = await ParticipantModel.create({ name: "Marcio", email: "marcio@example.com", editToken: "token-correto" });
	});

	it(`nao salva sem token de edicao`, async () => {
		await request(app).put(`/wishlist/${participant.id}`).send({ wishlist }).expect(403);
	});

	it(`nao salva com token errado`, async () => {
		await request(app)
			.put(`/wishlist/${participant.id}`)
			.set('X-Edit-Token', 'token-errado')
			.send({ wishlist })
			.expect(403);
	});

	it(`nao salva para participante inexistente`, async () => {
		await request(app)
			.put(`/wishlist/nao-existe`)
			.set('X-Edit-Token', 'token-correto')
			.send({ wishlist })
			.expect(403);
	});

	it(`cria a wishlist com o token correto e descarta campos nao permitidos`, async () => {
		const response = await request(app)
			.put(`/wishlist/${participant.id}`)
			.set('X-Edit-Token', 'token-correto')
			.send({ id: 'outro', admin: true, wishlist: wishlist.map(item => ({ ...item, hack: '<script>' })) })
			.expect('Content-Type', /json/)
			.expect(200);

		expect(response.body).toStrictEqual({
			id: participant.id,
			wishlist: [
				{ product: "iphone", price: "5000", infoExtra: wishlist[0].infoExtra },
				{ product: "ipad", price: "3000", infoExtra: wishlist[1].infoExtra },
			],
		});
	});

	it(`atualiza a wishlist existente`, async () => {
		await request(app)
			.put(`/wishlist/${participant.id}`)
			.set('X-Edit-Token', 'token-correto')
			.send({ wishlist: [wishlist[0]] })
			.expect(200);

		const response = await request(app).get(`/wishlist/${participant.id}`).expect(200);
		expect(response.body.wishlist).toHaveLength(1);
	});

	it(`rejeita lista invalida`, async () => {
		const put = (body) => request(app)
			.put(`/wishlist/${participant.id}`)
			.set('X-Edit-Token', 'token-correto')
			.send(body);

		await put({ wishlist: 'x' }).expect(400);
		await put({ wishlist: [{ product: '' }] }).expect(400);
		await put({ wishlist: Array(51).fill(wishlist[0]) }).expect(400);
	});

	it(`nao expoe listagem, criacao via POST nem exclusao`, async () => {
		await request(app).get('/wishlist').expect(404);
		await request(app).post('/wishlist').send({ id: participant.id, wishlist }).expect(404);
		await request(app).delete(`/wishlist/${participant.id}`).expect(404);
	});
});
