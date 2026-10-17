"use strict"

process.env.TEST = 7;
process.env.NOTIFY_EMAIL = 'false';
process.env.AFFILIATE_AMAZON_TAG = 'meusite-20';
process.env.AFFILIATE_MERCADOLIVRE_PARAMS = 'matt_word=meusite&matt_tool=123';
process.env.AFFILIATE_MAGALU_STORE = '';

require('module-alias/register');
const app = require('../app');
const request = require('supertest');
const ParticipantModel = require('@models/participantModel');

const requestEvent = {
	date: "2026-12-24",
	location: "Casa da Ana",
	amount: 60,
	message: "Feliz Natal!",
	host: { name: "Ana", email: "ana@example.com", profile: "mulher" },
	participants: [
		{ name: "Leo", email: "leo@example.com", profile: "crianca" },
		{ name: "Caio", email: "caio@example.com" },
	],
};

describe('Sugestoes de presente', () => {
	let organizer, ana, leo, caio;

	beforeAll(async () => {
		const response = await request(app).post('/event').send(requestEvent).expect(201);
		const token = new URL(response.body.organizerUrl).searchParams.get('token');

		organizer = (method, path = '') => request(app)[method](`/event/${response.body.id}/organizer${path}`).set('X-Admin-Token', token);

		const view = await organizer('get').expect(200);
		[ana, leo, caio] = view.body.participants;
	});

	it('guarda o perfil informado na criacao e mostra no painel', () => {
		expect(ana.profile).toBe('mulher');
		expect(leo.profile).toBe('crianca');
		expect(caio.profile).toBe('');
	});

	it('rejeita perfil invalido', async () => {
		await request(app).post('/event')
			.send({ ...requestEvent, host: { ...requestEvent.host, profile: 'idoso' } })
			.expect(400);
		await organizer('patch', `/participants/${caio.id}`).send({ profile: 'adulto' }).expect(400);
	});

	it('sugere presentes de crianca dentro do valor do evento, com links de afiliado', async () => {
		const response = await request(app).get(`/participant/${leo.id}/suggestions`).expect(200);

		expect(response.body.profile).toBe('crianca');
		expect(response.body.maxAmount).toBe(60);
		expect(response.body.items.length).toBeGreaterThan(0);
		expect(response.body.items.every(item => item.from <= 60)).toBe(true);
		expect(response.body.items.map(i => i.title)).toContain('Livro infantil');

		const [amazon, ml, ...rest] = response.body.items[0].links;
		expect(rest).toHaveLength(0); // Magalu sem loja configurada nao aparece
		expect(amazon.store).toBe('Amazon');
		expect(amazon.url).toMatch(/^https:\/\/www\.amazon\.com\.br\/s\?k=.+&rh=p_36%3A-6000&tag=meusite-20$/);
		expect(ml.store).toBe('Mercado Livre');
		expect(ml.url).toMatch(/^https:\/\/lista\.mercadolivre\.com\.br\/[a-z-]+_PriceRange_0-60\?matt_word=meusite&matt_tool=123$/);
	});

	it('usa sugestoes gerais sem perfil e passa a usar o perfil definido pelo organizador', async () => {
		const before = await request(app).get(`/participant/${caio.id}/suggestions`).expect(200);
		expect(before.body.profile).toBe('');

		await organizer('patch', `/participants/${caio.id}`).send({ profile: 'homem' }).expect(200);

		const after = await request(app).get(`/participant/${caio.id}/suggestions`).expect(200);
		expect(after.body.profile).toBe('homem');
		expect(after.body.items.map(i => i.title)).toContain('Kit de barbear');
	});

	it('participante sem evento vinculado recebe sugestoes sem filtro de preco', async () => {
		const old = await ParticipantModel.create({ name: 'Antigo', email: 'antigo@example.com' });
		const response = await request(app).get(`/participant/${old.id}/suggestions`).expect(200);

		expect(response.body.maxAmount).toBeNull();
		expect(response.body.items.length).toBeGreaterThan(0);
	});

	it('retorna 404 para participante inexistente', async () => {
		await request(app).get('/participant/nao-existe/suggestions').expect(404);
	});
});
