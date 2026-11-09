"use strict"

require('module-alias/register');

const logger = require('@utils/logger');

const TIMEOUT_MS = 5000;
const CACHE_MAX = 500;

// CEPs ja consultados (o endereco de um CEP praticamente nunca muda)
const cache = new Map();

/* Consulta um provedor; retorna o endereco, null (CEP inexistente) ou lanca erro (provedor indisponivel) */
const providers = [
	{
		name: 'ViaCEP',
		lookup: async (cep) => {
			const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
			if (response.status === 400) return null;
			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const data = await response.json();
			if (data.erro) return null;

			return { street: data.logradouro, district: data.bairro, city: data.localidade, state: data.uf };
		},
	},
	{
		name: 'BrasilAPI',
		lookup: async (cep) => {
			const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
			if (response.status === 404) return null;
			if (!response.ok) throw new Error(`HTTP ${response.status}`);

			const data = await response.json();
			return { street: data.street, district: data.neighborhood, city: data.city, state: data.state };
		},
	},
];

/*
 * Busca o endereco de um CEP (8 digitos).
 * Retorna { cep, street, district, city, state }, null se o CEP nao existe,
 * ou lanca erro se nenhum provedor respondeu.
 */
async function lookup(cep) {
	if (cache.has(cep)) return cache.get(cep);

	let lastError = null;

	for (const provider of providers) {
		try {
			const found = await provider.lookup(cep);
			const address = found && {
				cep,
				street: found.street || '',
				district: found.district || '',
				city: found.city || '',
				state: found.state || '',
			};

			if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
			cache.set(cep, address);

			return address;
		} catch (err) {
			lastError = err;
			logger.warn('cepService: provedor indisponível', { provider: provider.name, error: err.message });
		}
	}

	throw lastError;
}

module.exports = { lookup };
