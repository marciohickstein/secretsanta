"use strict"

process.env.TEST = 6;
process.env.ACCESS_GATE_ENABLED = 'true';
process.env.ACCESS_PASSWORD = 'senha-secreta';
process.env.ACCESS_LOGIN_ATTEMPTS = '5';
process.env.RESEND_WEBHOOK_SECRET = 'whsec_' + Buffer.from('x').toString('base64');

require('module-alias/register');
const request = require('supertest');
const app = require('../app');

const event = {
	location: "Casa", amount: 50, message: "Oi",
	host: { name: "Ana", email: "ana@example.com" },
	participants: [{ name: "Bia", email: "bia@example.com" }, { name: "Caio", email: "caio@example.com" }],
};

const login = (password, next) => request(app).post('/auth/login').send({ password, next });
const cookieOf = (response) => response.headers['set-cookie'][0].split(';')[0];

describe('Senha de acesso', () => {
	it('redireciona as paginas protegidas para o login', async () => {
		for (const path of ['/', '/index.html', '/event.html']) {
			const response = await request(app).get(path).set('Accept', 'text/html').expect(302);
			expect(response.headers.location).toBe(`/login.html?next=${encodeURIComponent(path)}`);
		}
	});

	it('bloqueia a criacao de eventos sem login', async () => {
		const response = await request(app).post('/event').send(event).expect(401);
		expect(response.body.message).toMatch(/Acesso restrito/);
	});

	it('mantem liberados o login, os arquivos e os links enviados por e-mail', async () => {
		for (const path of ['/login.html', '/painel.html', '/wishlist.html', '/crudWishlist.html', '/assets/css/style.css', '/libs/angular.min.js']) {
			await request(app).get(path).expect(200);
		}

		await request(app).get('/event/nao-existe').expect(404);
		await request(app).get('/event/nao-existe/organizer').set('X-Admin-Token', 'x').expect(403);
		await request(app).get('/participant/nao-existe').expect(404);
		await request(app).get('/wishlist/nao-existe').expect(404);
		await request(app).post('/webhooks/resend').send('{}').expect(401);
	});

	it('informa o status sem login', async () => {
		const response = await request(app).get('/auth/status').expect(200);
		expect(response.body).toEqual({ enabled: true, authenticated: false });
	});

	it('recusa senha incorreta', async () => {
		const response = await login('errada').expect(401);
		expect(response.body.message).toBe('Senha incorreta.');
		expect(response.headers['set-cookie']).toBeUndefined();
	});

	it('com a senha correta cria a sessao e libera o acesso', async () => {
		const response = await login('senha-secreta', '/index.html?test=1').expect(200);
		expect(response.body).toEqual({ ok: true, redirect: '/index.html?test=1' });

		const setCookie = response.headers['set-cookie'][0];
		expect(setCookie).toMatch(/HttpOnly/);
		expect(setCookie).toMatch(/SameSite=Lax/);

		const cookie = cookieOf(response);

		await request(app).get('/').set('Cookie', cookie).expect(200);
		await request(app).post('/event').set('Cookie', cookie).send(event).expect(201);

		const status = await request(app).get('/auth/status').set('Cookie', cookie);
		expect(status.body.authenticated).toBe(true);
	});

	it('recusa cookie adulterado ou expirado', async () => {
		const cookie = cookieOf(await login('senha-secreta'));
		const [name, value] = cookie.split('=');
		const [expiresAt, signature] = decodeURIComponent(value).split('.');

		const tampered = `${name}=${encodeURIComponent(`${Number(expiresAt) + 1}.${signature}`)}`;
		await request(app).post('/event').set('Cookie', tampered).send(event).expect(401);

		const expired = `${name}=${encodeURIComponent(`${Date.now() - 1000}.${signature}`)}`;
		await request(app).post('/event').set('Cookie', expired).send(event).expect(401);
	});

	it('nao aceita redirecionamento para outro site', async () => {
		for (const next of ['//evil.com', 'https://evil.com', '/\\evil.com']) {
			const response = await login('senha-secreta', next).expect(200);
			expect(response.body.redirect).toBe('/');
		}
	});

	it('logout encerra a sessao no navegador', async () => {
		const response = await request(app).post('/auth/logout').expect(200);
		expect(response.headers['set-cookie'][0]).toMatch(/ss_access=;/);
	});

	it('limita as tentativas de senha', async () => {
		let last;
		for (let i = 0; i < 6; i++) last = await login('errada');
		expect(last.status).toBe(429);
	});
});
