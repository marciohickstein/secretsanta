// #######################################################
// Lista de presentes do amigo secreto (wishlist.html?idparticipant=...&idevent=...)
// #######################################################

import { $, h, icon, mount, param } from '../lib/dom.js';
import { events, participants, wishlists } from '../lib/api.js';
import { initLogout } from '../lib/ui.js';
import { loadSuggestions } from '../lib/suggestions.js';

initLogout();

const idParticipant = param('idparticipant');
const idEvent = param('idevent');

let friendName = '';

const fact = (iconName, label, ...value) => h('div', { class: 'fact' },
	h('div', { class: 'fact-k' }, icon(iconName), label),
	h('div', { class: 'fact-v' }, ...value));

async function loadEvent() {
	if (!idEvent) return;
	try {
		const event = await events.get(idEvent);
		mount($('#event-facts'),
			fact('calendar-event', 'Data', event.date || '—'),
			fact('geo-alt', 'Local', event.location || '—',
				event.mapUrl && h('div', {}, h('a', { href: event.mapUrl, target: '_blank', rel: 'noopener noreferrer' }, icon('map'), ' Ver no mapa'))),
			fact('cash-coin', 'Valor máx.', event.amount || '—'),
			fact('people', 'Participantes', `${event.participantsCount} pessoas`));
		$('#event-card').hidden = false;
	} catch (err) {
		console.log(err);
	}
}

async function loadParticipant() {
	const target = $('#friend-name');
	if (!idParticipant) { target.textContent = '—'; return; }
	try {
		const p = await participants.get(idParticipant);
		friendName = (p && p.name) || '';
		target.textContent = friendName || '—';
	} catch (err) {
		console.log(err);
		target.textContent = '—';
	}
}

async function loadWishlist() {
	let items = [];
	if (idParticipant) {
		try {
			const data = await wishlists.get(idParticipant);
			items = (data && data.wishlist) || [];
		} catch (err) {
			if (err.status !== 404) console.log(err);
		}
	}

	if (!items.length) {
		mount($('#gifts'), h('li', { class: 'empty' }, icon('inbox'), 'Nenhum presente cadastrado ainda. Dê uma olhada nas ideias abaixo!'));
		return;
	}

	mount($('#gifts'), items.map((wl, i) => h('li', { class: 'gift' },
		h('span', { class: 'gift-num' }, String(i + 1)),
		h('div', { style: 'min-width:0' },
			h('div', { class: 'gift-title' }, wl.product),
			wl.infoExtra && h('div', { class: 'gift-info' }, wl.infoExtra)),
		h('div', { class: 'gift-foot' },
			wl.price && h('span', { class: 'pill pill-ok' }, icon('tag-fill'), /^r\$/i.test(String(wl.price).trim()) ? wl.price : `R$ ${wl.price}`),
			(wl.links || []).map((l) => h('a', {
				class: 'btn btn-sm', href: l.url, target: '_blank', rel: 'sponsored noopener noreferrer',
				title: `Pesquisar ${wl.product} na ${l.store}`,
			}, icon('search'), l.store))))));
}

await Promise.all([loadEvent(), loadParticipant(), loadWishlist()]);

loadSuggestions(idParticipant, {
	lead: ({ profile, maxAmount }) => [
		'Sem inspiração? Sugestões para ', profile || 'qualquer pessoa',
		maxAmount ? ` de até R$ ${maxAmount}` : '', ', já filtradas pelo valor do evento.',
	],
}).then(() => {
	if (friendName) $('#ideas-title').textContent = `Ideias de presente para ${friendName}`;
});
