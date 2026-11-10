"use strict"

process.env.TEST = 9;
process.env.SMS_GATEWAY_URL = 'https://gateway.example/3rdparty/v1/';
process.env.SMS_GATEWAY_USERNAME = 'usuario';
process.env.SMS_GATEWAY_PASSWORD = 'senha';

require('module-alias/register');
const sms = require('../utils/smsSender');

const reply = (status, body) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });

describe('smsSender', () => {
	const originalFetch = global.fetch;
	afterEach(() => { global.fetch = originalFetch; });

	it('envia e retorna o id e o estado da mensagem', async () => {
		global.fetch = jest.fn(async () => reply(202, { id: 'abc', state: 'Pending', recipients: [{ phoneNumber: '+5551999990001', state: 'Pending' }] }));

		await expect(sms.send('51 99999-0001', 'Amigo Secreto', 'Oi')).resolves.toEqual({ id: 'abc', state: 'Pending' });

		const [url, options] = global.fetch.mock.calls[0];
		expect(url).toBe('https://gateway.example/3rdparty/v1/message');
		expect(options.headers.Authorization).toBe(`Basic ${Buffer.from('usuario:senha').toString('base64')}`);
		expect(JSON.parse(options.body)).toEqual({ textMessage: { text: 'Amigo Secreto: Oi' }, phoneNumbers: ['+5551999990001'] });
	});

	it('retorna erro para numero invalido sem chamar o gateway', async () => {
		global.fetch = jest.fn();
		await expect(sms.send('9999-0001', 'x', 'y')).resolves.toMatchObject({ error: expect.stringMatching(/inválido/) });
		expect(global.fetch).not.toHaveBeenCalled();
	});

	it('retorna erro quando o gateway recusa ou nao responde', async () => {
		global.fetch = jest.fn(async () => reply(503, { error: 'QueueLimitExceeded', message: 'queue limits exceeded' }));
		await expect(sms.send('51999990001', 'x', 'y')).resolves.toEqual({ error: 'queue limits exceeded' });

		global.fetch = jest.fn(async () => { throw new Error('timeout'); });
		await expect(sms.send('51999990001', 'x', 'y')).resolves.toMatchObject({ error: expect.any(String) });
	});

	it('consulta o estado e o motivo da falha', async () => {
		global.fetch = jest.fn(async () => reply(200, { id: 'abc', state: 'Failed', recipients: [{ phoneNumber: '+5551999990001', state: 'Failed', error: 'Invalid number' }] }));

		await expect(sms.getStatus('abc')).resolves.toEqual({ state: 'Failed', reason: 'Invalid number' });
		expect(global.fetch.mock.calls[0][0]).toBe('https://gateway.example/3rdparty/v1/messages/abc');

		global.fetch = jest.fn(async () => reply(200, { id: 'abc', state: 'Delivered' }));
		await expect(sms.getStatus('abc')).resolves.toEqual({ state: 'Delivered', reason: null });
	});
});

describe('smsSender (compatibilidade)', () => {
	const originalFetch = global.fetch;
	afterEach(() => { global.fetch = originalFetch; });

	it('aceita resposta sem id e consulta pela rota antiga quando a nova nao existe', async () => {
		global.fetch = jest.fn(async () => reply(202, {}));
		await expect(sms.send('51999990001', 'x', 'y')).resolves.toEqual({ id: null, state: 'Pending' });

		global.fetch = jest.fn(async (url) => (url.includes('/messages/') ? reply(404, {}) : reply(200, { state: 'Sent' })));
		await expect(sms.getStatus('abc')).resolves.toEqual({ state: 'Sent', reason: null });
		expect(global.fetch.mock.calls[1][0]).toBe('https://gateway.example/3rdparty/v1/message/abc');
	});
});
