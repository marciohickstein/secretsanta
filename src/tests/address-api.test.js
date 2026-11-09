"use strict"

process.env.TEST = 3;

require('module-alias/register');
const app = require('../app');
const request = require('supertest');

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('API /address/cep', () => {
	afterEach(() => jest.restoreAllMocks());

	it('retorna o endereco do CEP (ViaCEP)', async () => {
		jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(200, {
			cep: '01001-000', logradouro: 'Praça da Sé', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP',
		}));

		const response = await request(app).get('/address/cep/01001-000').expect(200);

		expect(response.body).toEqual({ cep: '01001000', street: 'Praça da Sé', district: 'Sé', city: 'São Paulo', state: 'SP' });
		expect(fetch).toHaveBeenCalledWith('https://viacep.com.br/ws/01001000/json/', expect.any(Object));
	});

	it('usa a BrasilAPI quando o ViaCEP esta fora do ar', async () => {
		jest.spyOn(global, 'fetch')
			.mockRejectedValueOnce(new Error('timeout'))
			.mockResolvedValueOnce(jsonResponse(200, { street: 'Rua A', neighborhood: 'Centro', city: 'Curitiba', state: 'PR' }));

		const response = await request(app).get('/address/cep/80010000').expect(200);

		expect(response.body).toMatchObject({ street: 'Rua A', city: 'Curitiba', state: 'PR' });
	});

	it('retorna 404 para CEP inexistente', async () => {
		jest.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(200, { erro: true }));

		await request(app).get('/address/cep/99999999').expect(404);
	});

	it('retorna 503 quando nenhum provedor responde', async () => {
		jest.spyOn(global, 'fetch').mockRejectedValue(new Error('offline'));

		await request(app).get('/address/cep/12345678').expect(503);
	});

	it('rejeita CEP com formato invalido', async () => {
		await request(app).get('/address/cep/123').expect(400);
	});
});
