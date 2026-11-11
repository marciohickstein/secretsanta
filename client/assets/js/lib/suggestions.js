// #######################################################
// Card de ideias de presente (links de afiliado)
// Usado na lista do amigo secreto e na edicao da propria lista.
// #######################################################

import { $, h, icon, mount } from './dom.js';
import { participants } from './api.js';

const PROFILE_TEXT = { crianca: 'criança', mulher: 'mulher', homem: 'homem' };

/*
 * Busca as sugestoes do participante e preenche #ideas-card.
 * onAdd(sugestao), se informado, mostra o botao "+" para adicionar a lista.
 * lead(data) monta o texto de introducao.
 */
export async function loadSuggestions(participantId, { onAdd, lead } = {}) {
	if (!participantId) return;

	let data;
	try {
		data = await participants.suggestions(participantId);
	} catch (err) {
		console.log(err);
		return;
	}

	const items = (data && data.items) || [];
	if (!items.length) return;

	const info = { profile: PROFILE_TEXT[data.profile] || '', maxAmount: data.maxAmount };
	if (lead) $('#ideas-lead').replaceChildren(...[].concat(lead(info)));

	mount($('#ideas'), items.map((s) => h('div', { class: 'idea' },
		h('div', { class: 'idea-head' },
			h('span', { class: 'idea-icon' }, h('i', { class: `bi ${/^bi-[a-z0-9-]+$/.test(s.icon || '') ? s.icon : 'bi-gift'}`, 'aria-hidden': 'true' })),
			h('div', {},
				h('div', { class: 'idea-title' }, s.title),
				h('div', { class: 'idea-from' }, `a partir de R$ ${s.from}`))),
		h('div', { class: 'row' },
			(s.links || []).map((l) => h('a', {
				class: 'btn btn-sm', href: l.url, target: '_blank', rel: 'sponsored noopener noreferrer',
			}, icon('box-arrow-up-right'), l.store)),
			onAdd && h('button', {
				type: 'button', class: 'btn btn-sm btn-pine', title: 'Adicionar à minha lista', 'aria-label': `Adicionar ${s.title} à minha lista`,
				onClick: () => onAdd(s),
			}, icon('plus-lg'), 'Adicionar')))));

	$('#ideas-card').hidden = false;
}
