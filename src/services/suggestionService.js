"use strict"

require('module-alias/register');

const config = require('@config');
const catalog = require('@config/giftSuggestions');

const MAX_ITEMS = 8;

const slug = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, '-');

/* Monta o link de busca de cada loja, com o codigo de afiliado e o teto de preco quando houver */
const stores = {
	amazon: {
		name: 'Amazon',
		url: (query, max) => {
			const params = new URLSearchParams({ k: query });
			if (max) params.set('rh', `p_36:-${Math.round(max * 100)}`);
			if (config.suggestions.amazonTag) params.set('tag', config.suggestions.amazonTag);
			return `https://www.amazon.com.br/s?${params}`;
		},
	},
	mercadolivre: {
		name: 'Mercado Livre',
		url: (query, max) => {
			const range = max ? `_PriceRange_0-${Math.round(max)}` : '';
			const extra = config.suggestions.mercadoLivreParams;
			return `https://lista.mercadolivre.com.br/${encodeURIComponent(slug(query))}${range}${extra ? `?${extra}` : ''}`;
		},
	},
	magalu: {
		name: 'Magalu',
		// Disponivel somente com a loja do Parceiro Magalu configurada
		enabled: () => Boolean(config.suggestions.magaluStore),
		url: (query) => `https://www.magazinevoce.com.br/${encodeURIComponent(config.suggestions.magaluStore)}/busca/${encodeURIComponent(query)}/`,
	},
};

const activeStores = () => config.suggestions.stores
	.filter(key => stores[key] && (!stores[key].enabled || stores[key].enabled()));

/* Links de busca de um produto em cada loja parceira ativa (max: teto de preco opcional) */
const searchLinks = (query, max) =>
	activeStores().map(key => ({ store: stores[key].name, url: stores[key].url(query, max) }));

/* Escolhe as ideias que cabem no valor maximo; se nenhuma couber, mostra as mais baratas */
function pick(items, max) {
	if (!max) return items.slice(0, MAX_ITEMS);

	const fit = items.filter(item => item.from <= max);
	if (fit.length) return fit.slice(0, MAX_ITEMS);

	return [...items].sort((a, b) => a.from - b.from).slice(0, 4);
}

/* Sugestoes de presente para o perfil informado (crianca, mulher, homem ou vazio) */
function suggest(profile, maxAmount) {
	const max = Number(maxAmount) > 0 ? Number(maxAmount) : 0;
	const items = catalog[profile] || catalog.geral;

	return {
		profile: catalog[profile] ? profile : '',
		maxAmount: max || null,
		items: pick(items, max).map(item => ({
			title: item.title,
			icon: item.icon,
			from: item.from,
			links: searchLinks(item.query, max),
		})),
	};
}

module.exports = { suggest, searchLinks };
