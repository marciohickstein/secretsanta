"use strict"

const { Resolver } = require('dns').promises;
const config = require('@config');
const { checkEmailDomains } = require('@utils/validation');

const dnsError = (code) => Object.assign(new Error(code), { code });

// DNS simulado: dominio -> registros MX (ou codigo de erro)
const MX = {
	'gmail.com': [{ exchange: 'gmail-smtp-in.l.google.com', priority: 5 }],
	'nullmx.com': [{ exchange: '', priority: 0 }],
	'semmx.com': 'ENODATA',
	'lento.com': 'ETIMEOUT',
};

describe(`Testing checkEmailDomains()...`, () => {
	beforeAll(() => {
		config.email.checkDomains = true;

		jest.spyOn(Resolver.prototype, 'resolveMx').mockImplementation(async (domain) => {
			const mx = MX[domain] ?? 'ENOTFOUND';
			if (typeof mx === 'string') throw dnsError(mx);
			return mx;
		});
		jest.spyOn(Resolver.prototype, 'resolve4').mockImplementation(async (domain) => {
			if (domain === 'semmx.com') return ['203.0.113.10'];
			throw dnsError('ENODATA');
		});
		jest.spyOn(Resolver.prototype, 'resolve6').mockRejectedValue(dnsError('ENODATA'));
	});

	afterAll(() => {
		config.email.checkDomains = false;
		jest.restoreAllMocks();
	});

	it(`aceita dominios que recebem e-mail`, async () => {
		await expect(checkEmailDomains(['a@gmail.com', 'b@semmx.com'])).resolves.toBeUndefined();
	});

	it(`recusa dominio inexistente`, async () => {
		await expect(checkEmailDomains(['a@gmail.com', 'hicky.kt@gmail.comx']))
			.rejects.toMatchObject({ status: 400, message: expect.stringContaining('hicky.kt@gmail.comx') });
	});

	it(`recusa dominio com "null MX"`, async () => {
		await expect(checkEmailDomains(['a@nullmx.com'])).rejects.toMatchObject({ status: 400 });
	});

	it(`nao bloqueia quando o DNS falha (timeout)`, async () => {
		await expect(checkEmailDomains(['a@lento.com'])).resolves.toBeUndefined();
	});
});
