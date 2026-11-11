// #######################################################
// Pagina inicial: criacao do evento de amigo secreto
// #######################################################

import { $, $$, h, icon, mount, param } from '../lib/dom.js';
import { events, address as addressApi, errorText } from '../lib/api.js';
import { showMessage, setBusy, initLogout } from '../lib/ui.js';
import { pad, onlyDigits, capitalize, formatMoney, parseMoney, PROFILES } from '../lib/format.js';

initLogout();

// ── Datas ──

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const defaultTime = () => new Date(1970, 0, 1, 20, 0);
const sameDay = (a, b) => a instanceof Date && b instanceof Date && a.toDateString() === b.toDateString();

// Proxima ocorrencia de um dia do ano (ex.: 24/12) a partir de hoje
const nextDayOfYear = (month, day) => {
	const today = startOfToday();
	const d = new Date(today.getFullYear(), month, day);
	if (d < today) d.setFullYear(d.getFullYear() + 1);
	return d;
};

// Proximo dia da semana (0 = domingo); se hoje for o dia, pula para a semana seguinte
const nextWeekday = (weekday) => {
	const d = startOfToday();
	d.setDate(d.getDate() + (((weekday - d.getDay() + 7) % 7) || 7));
	return d;
};

/* Junta a data e o horario escolhidos; null se algum estiver vazio ou invalido */
const combineDateTime = (date, time) => {
	if (!(date instanceof Date) || isNaN(date) || !(time instanceof Date) || isNaN(time)) return null;
	return new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());
};

// Ex.: "quinta-feira, 24/12/2026 às 20:00" (texto exibido nos e-mails e no painel)
const formatPartyDate = (d) =>
	`${d.toLocaleDateString('pt-BR', { weekday: 'long' })}, ${d.toLocaleDateString('pt-BR')} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;

const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

// Ex.: "Rua das Flores, 260 - Centro - Porto Alegre/RS" (o servidor monta o texto final, com o CEP)
const formatAddress = (a) => {
	const street = [a.street, a.number, a.complement].filter(Boolean).join(', ');
	const city = a.city && a.state ? `${a.city}/${a.state}` : a.city;
	return [street, a.district, city].filter(Boolean).join(' - ');
};

// ── Atalhos ──

const DATE_SHORTCUTS = [
	{ label: 'Véspera de Natal', date: () => nextDayOfYear(11, 24) },
	{ label: 'Natal', date: () => nextDayOfYear(11, 25) },
	{ label: 'Próxima sexta', date: () => nextWeekday(5) },
	{ label: 'Próximo sábado', date: () => nextWeekday(6) },
];

const AMOUNT_SHORTCUTS = [50, 100, 150, 200];

const PLACE_SUGGESTIONS = ['Salão de festas do prédio', 'Minha casa', 'Casa da vó', 'Churrasqueira do condomínio', 'Escritório', 'Restaurante'];

const MESSAGE_SUGGESTIONS = [
	{ label: 'Natal em família', text: 'Olá, família! Chegou a hora do nosso amigo secreto de Natal. Confira quem você tirou, capriche no presente e venha preparado para muita alegria. Boas festas!' },
	{ label: 'Turma do trabalho', text: 'Oi, pessoal! Vamos fechar o ano em clima de festa com o nosso amigo secreto. Respeitem o valor combinado e guardem segredo até o dia da revelação!' },
	{ label: 'Entre amigos', text: 'E aí, galera! O sorteio do nosso amigo secreto está feito. Mantenham o segredo, caprichem na escolha e bora comemorar juntos!' },
	{ label: 'Curta e direta', text: 'Sorteio feito! Veja quem você tirou e não conte para ninguém. Nos vemos na festa!' },
	{ label: 'Divertida', text: 'Atenção, Papais Noéis disfarçados! O sorteio já rolou. Proibido dar spoiler, proibido presente de última hora e obrigatório chegar com fome. Ho ho ho!' },
];

// ── Estado ──

let uid = 0;
const newPerson = (data = {}) => ({ uid: ++uid, name: '', email: '', celphone: '', profile: '', ...data });

const state = {
	eventDate: null,
	eventTime: defaultTime(),
	amount: null,
	address: {},
	message: '',
	participants: [newPerson(), newPerson(), newPerson()],
	saving: false,
};

let lastCep = '';

// ── Elementos ──

const form = $('#event-form');
const dateInput = $('#party_eventdate');
const timeInput = $('#party_eventtime');
const amountInput = $('#party_amount');
const cepInput = $('#party_cep');
const messageInput = $('#party_message');
const submitButton = $('#create-party-btn');
const addressInputs = $$('[data-addr]');

const stateSelect = $('#party_state');
UFS.forEach((uf) => stateSelect.append(h('option', { value: uf }, uf)));

// ── Seletores de data/hora em portugues (flatpickr), independente do idioma do navegador ──

const pickerBase = { locale: 'pt', allowInput: true, disableMobile: true };

const datePicker = window.flatpickr(dateInput, {
	...pickerBase,
	dateFormat: 'd/m/Y',
	minDate: 'today',
	onChange: (dates) => { state.eventDate = dates[0] || null; refresh(); },
});

const timePicker = window.flatpickr(timeInput, {
	...pickerBase,
	enableTime: true,
	noCalendar: true,
	time_24hr: true,
	dateFormat: 'H:i',
	minuteIncrement: 15,
	defaultDate: state.eventTime,
	onChange: (dates) => { state.eventTime = dates[0] || null; refresh(); },
});

// ── Chips ──

const chip = (label, onClick, extra = {}) => h('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', onClick, ...extra }, label);

const dateChips = DATE_SHORTCUTS.map((s) => chip(s.label, () => {
	state.eventDate = s.date();
	datePicker.setDate(state.eventDate, false);
	if (!state.eventTime) {
		state.eventTime = defaultTime();
		timePicker.setDate(state.eventTime, false);
	}
	refresh();
}));
mount($('#date-chips'), dateChips);

const amountChips = AMOUNT_SHORTCUTS.map((v) => chip(`R$ ${v}`, () => {
	state.amount = v;
	amountInput.value = formatMoney(v);
	refresh();
}));
mount($('#amount-chips'), amountChips);

const placeChips = PLACE_SUGGESTIONS.map((p) => chip(p, () => {
	state.address.place = p;
	$('#party_place').value = p;
	refresh();
}));
mount($('#place-chips'), placeChips);

const messageChips = MESSAGE_SUGGESTIONS.map((m) => chip(m.label, () => {
	state.message = m.text;
	messageInput.value = m.text;
	refresh();
}, { title: m.text }));
mount($('#message-chips'), messageChips);

// ── Valor do presente: aceita "80", "80,50" ou "1.500" ──

amountInput.addEventListener('input', () => {
	const allowed = amountInput.value.replace(/[^\d.,]/g, '');
	if (allowed !== amountInput.value) amountInput.value = allowed;
	state.amount = parseMoney(allowed);
	refresh();
});

amountInput.addEventListener('blur', () => {
	amountInput.value = formatMoney(state.amount);
});

// ── Endereco ──

addressInputs.forEach((input) => {
	const key = input.dataset.addr;
	input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
		state.address[key] = input.value;
		refresh();
	});
});

const setAddressField = (key, value) => {
	state.address[key] = value || '';
	const input = $(`[data-addr="${key}"]`);
	if (input) input.value = value || '';
};

const CEP_ICONS = {
	loading: () => h('span', { class: 'spinner', style: 'width:16px;height:16px;color:var(--berry)', 'aria-hidden': 'true' }),
	found: () => icon('check-circle-fill', '', { style: 'color:var(--ok)' }),
	notfound: () => icon('exclamation-circle-fill'),
	error: () => icon('wifi-off'),
};

const setCepStatus = (status, message) => {
	const iconHost = $('#cep-icon');
	const view = CEP_ICONS[status];
	mount(iconHost, view ? view() : icon('mailbox'));
	iconHost.style.color = status === 'found' ? 'var(--ok)' : status === 'notfound' || status === 'error' ? 'var(--warn)' : '';
	$('#party_cep_status').textContent = message || 'Preenchemos o endereço para você.';
};

// Mascara 00000-000 e busca automatica ao completar os 8 digitos
const onCepChange = () => {
	const digits = onlyDigits(cepInput.value).slice(0, 8);
	cepInput.value = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
	state.address.cep = cepInput.value;
	refresh();

	if (digits.length < 8) {
		lastCep = '';
		setCepStatus(null);
		return;
	}

	if (digits === lastCep) return;
	lastCep = digits;

	setCepStatus('loading', 'Buscando endereço...');

	addressApi.lookupCep(digits)
		.then((found) => {
			if (lastCep !== digits) return; // o CEP mudou enquanto buscava

			setAddressField('street', found.street || state.address.street);
			setAddressField('district', found.district || state.address.district);
			setAddressField('city', found.city);
			setAddressField('state', found.state);
			refresh();

			setCepStatus('found', found.street ? 'Endereço encontrado! Falta só o número.' : 'CEP geral da cidade: informe a rua e o número.');

			// Leva o cursor para o proximo campo que falta preencher
			$(found.street ? '#party_number' : '#party_street').focus();
		})
		.catch((err) => {
			if (lastCep !== digits) return;

			setCepStatus(err.status === 404 || err.status === 400 ? 'notfound' : 'error',
				errorText(err, 'Não foi possível buscar o CEP. Preencha o endereço manualmente.'));
		});
};

cepInput.addEventListener('input', onCepChange);

// ── Mensagem ──

messageInput.addEventListener('input', () => { state.message = messageInput.value; refresh(); });

// ── Participantes ──

const peopleList = $('#people');

const personField = (person, key, props) => h('input', {
	class: 'input',
	value: person[key] || '',
	onInput: (e) => { person[key] = e.target.value; refresh(); },
	...props,
});

function renderPeople() {
	mount(peopleList, state.participants.map((person, index) => {
		const isHost = index === 0;
		const who = isHost ? 'Organizador' : `Participante ${index + 1}`;

		return h('li', { class: ['person', isHost && 'is-host'] },
			h('span', { class: 'person-avatar', 'aria-hidden': 'true' }, isHost ? icon('star-fill') : String(index + 1)),
			h('div', { class: 'person-fields' },
				personField(person, 'name', { type: 'text', placeholder: isHost ? 'Seu nome' : 'Nome', maxLength: 100, 'aria-label': `Nome — ${who}`, autocomplete: isHost ? 'name' : 'off' }),
				personField(person, 'email', { type: 'email', placeholder: 'email@exemplo.com', maxLength: 254, 'aria-label': `E-mail — ${who}`, autocomplete: isHost ? 'email' : 'off' }),
				personField(person, 'celphone', { type: 'tel', placeholder: 'Celular (51 9...)', inputMode: 'tel', maxLength: 20, 'aria-label': `Celular — ${who}`, autocomplete: isHost ? 'tel' : 'off' }),
			),
			h('div', { class: 'person-foot' },
				h('div', { class: 'seg', role: 'radiogroup', 'aria-label': `Perfil — ${who}` },
					PROFILES.map((p) => h('label', {},
						h('input', {
							type: 'radio', name: `profile-${person.uid}`, value: p.value, checked: person.profile === p.value,
							onChange: () => { person.profile = p.value; refresh(); },
						}),
						h('span', {}, icon(p.icon), p.label),
					)),
				),
				h('span', { class: 'spacer' }),
				isHost
					? h('span', { class: 'badge-host' }, icon('star-fill'), 'Organizador')
					: h('button', {
						type: 'button', class: 'btn btn-sm btn-danger-ghost', 'aria-label': `Remover ${who}`,
						onClick: () => { state.participants.splice(index, 1); renderPeople(); refresh(); },
					}, icon('trash3'), 'Remover'),
			),
		);
	}));
}

$('#add-person').addEventListener('click', () => {
	state.participants.push(newPerson());
	renderPeople();
	refresh();
	const inputs = $$('.person:last-child .input', peopleList);
	if (inputs[0]) inputs[0].focus();
});

// ── Resumo e indicadores ──

const datePreview = () => {
	const d = combineDateTime(state.eventDate, state.eventTime);
	if (!d) return '';
	const text = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
	return `${capitalize(text)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const daysLeft = () => {
	if (!(state.eventDate instanceof Date)) return '';
	const days = Math.round((state.eventDate - startOfToday()) / 86400000);
	if (days < 0) return '';
	if (days === 0) return 'é hoje!';
	if (days === 1) return 'é amanhã!';
	return `faltam ${days} dias`;
};

const addressPreview = () => {
	const a = state.address;
	return a.street && a.number && a.city ? `${a.place ? `${a.place} — ` : ''}${formatAddress(a)}` : '';
};

const personComplete = (p) => p.name && p.email && p.celphone && p.profile;

function refresh() {
	// Chips ativos
	DATE_SHORTCUTS.forEach((s, i) => dateChips[i].setAttribute('aria-pressed', String(sameDay(state.eventDate, s.date()))));
	AMOUNT_SHORTCUTS.forEach((v, i) => amountChips[i].setAttribute('aria-pressed', String(state.amount === v)));
	PLACE_SUGGESTIONS.forEach((p, i) => placeChips[i].setAttribute('aria-pressed', String(state.address.place === p)));
	MESSAGE_SUGGESTIONS.forEach((m, i) => messageChips[i].setAttribute('aria-pressed', String(state.message === m.text)));

	// Previas
	const dateText = datePreview();
	const datePrev = $('#date-preview');
	datePrev.hidden = !dateText;
	if (dateText) mount(datePrev, icon('check-circle-fill'), h('span', {}, dateText, ' ', h('span', { class: 'muted' }, daysLeft() && `· ${daysLeft()}`)));

	const addrText = addressPreview();
	const addrPrev = $('#address-preview');
	addrPrev.hidden = !addrText;
	if (addrText) {
		mount(addrPrev, icon('pin-map-fill'), h('span', {}, addrText, ' ',
			h('a', { href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formatAddress(state.address))}`, target: '_blank', rel: 'noopener noreferrer' }, 'ver no mapa')));
	}

	// Etapas concluidas
	const a = state.address;
	const filled = state.participants.filter(personComplete).length;
	const steps = {
		when: Boolean(combineDateTime(state.eventDate, state.eventTime)) && state.amount > 0,
		where: onlyDigits(a.cep).length === 8 && Boolean(a.street && a.number && a.city && a.state),
		who: state.participants.length >= 3 && filled === state.participants.length,
		message: Boolean(state.message.trim()),
	};

	$('#block-when').classList.toggle('is-done', steps.when);
	$('#block-where').classList.toggle('is-done', steps.where);
	$('#block-who').classList.toggle('is-done', steps.who);
	$('#block-message').classList.toggle('is-done', steps.message);

	const done = Object.values(steps).filter(Boolean).length;
	$('#progress-label').textContent = `${done} de 4 etapas`;
	$('#progress-bar').style.width = `${done * 25}%`;

	const item = (ok, iconName, label, value, empty) => h('li', { class: ok && 'is-done' },
		icon(ok ? 'check-circle-fill' : iconName),
		h('div', { style: 'min-width:0' },
			h('div', { class: 'summary-k' }, label),
			h('div', { class: ['summary-v', !value && 'empty'] }, value || empty)));

	mount($('#summary'),
		item(steps.when, 'calendar-event', 'Quando', dateText, 'Escolha a data'),
		item(state.amount > 0, 'cash-coin', 'Valor', state.amount > 0 ? `até R$ ${formatMoney(state.amount)}` : '', 'Defina o valor'),
		item(steps.where, 'geo-alt', 'Onde', a.place || (a.city ? `${a.city}${a.state ? `/${a.state}` : ''}` : ''), 'Informe o CEP'),
		item(steps.who, 'people', 'Participantes', `${filled} de ${state.participants.length} completos`, ''),
	);
}

// ── Validacao e envio ──

function validate() {
	const partyDate = combineDateTime(state.eventDate, state.eventTime);
	if (!partyDate) return ['#block-when', 'Escolha a data e o horário da festa. Dica: use os atalhos, como "Véspera de Natal".'];
	if (partyDate < new Date()) return ['#block-when', 'A data da festa já passou. Escolha uma data e horário a partir de agora.'];
	if (!(state.amount > 0)) return ['#block-when', 'Informe o valor do presente, por exemplo R$ 100. Dica: use os atalhos abaixo do campo.'];

	const a = state.address;
	if (onlyDigits(a.cep).length !== 8) return ['#block-where', 'Informe o CEP do local da festa (8 números). Com ele preenchemos o endereço para você.'];
	if (!a.street || !a.number || !a.city || !a.state) return ['#block-where', 'Complete o endereço da festa: rua, número, cidade e UF.'];

	if (state.participants.length < 3) return ['#block-who', 'O amigo secreto precisa de pelo menos 3 participantes, incluindo você.'];

	for (const [index, p] of state.participants.entries()) {
		const who = index === 0 ? 'do organizador (participante 1)' : `do participante ${index + 1}`;
		if (!p.name || !p.email || !p.celphone) return ['#block-who', `Preencha nome, e-mail válido e celular ${who}.`];
		// O perfil define as sugestoes de presente (crianca, mulher ou homem)
		if (!p.profile) return ['#block-who', `Informe se ${who} é criança, mulher ou homem. Usamos isso para sugerir presentes.`];
	}

	if (!state.message.trim()) return ['#block-message', 'Escreva uma mensagem para os convidados.'];

	return null;
}

function resetForm() {
	state.eventDate = null;
	state.eventTime = defaultTime();
	state.amount = null;
	state.address = {};
	state.message = '';
	state.participants = [newPerson(), newPerson(), newPerson()];
	lastCep = '';

	datePicker.clear(false);
	timePicker.setDate(state.eventTime, false);
	amountInput.value = '';
	cepInput.value = '';
	messageInput.value = '';
	addressInputs.forEach((input) => { input.value = ''; });
	setCepStatus(null);
	renderPeople();
	refresh();
	window.scrollTo({ top: 0, behavior: 'smooth' });
}

const pick = ({ name, email, celphone, profile }) => ({ name: name.trim(), email: email.trim(), celphone: celphone.trim(), profile });

form.addEventListener('submit', async (e) => {
	e.preventDefault();
	if (state.saving) return;

	const problem = validate();
	if (problem) {
		const [block, message] = problem;
		await showMessage({ type: 'error', title: 'Quase lá!', message });
		$(block).scrollIntoView({ behavior: 'smooth', block: 'start' });
		return;
	}

	const [host, ...rest] = state.participants.map(pick);
	const event = {
		date: formatPartyDate(combineDateTime(state.eventDate, state.eventTime)),
		address: { ...state.address },
		amount: state.amount,
		host,
		message: state.message,
		participants: rest,
	};

	state.saving = true;
	setBusy(submitButton, true, 'Criando evento...');

	try {
		const response = await events.create(event);
		setBusy(submitButton, false);
		state.saving = false;

		const link = response && response.organizerUrl;
		await showMessage({
			type: 'success',
			title: 'Evento criado! 🎉',
			message: 'Agora é só fazer o sorteio pelo painel do organizador.',
			body: [
				h('div', { class: 'mail-note' }, icon('envelope-paper-heart-fill'),
					h('div', {}, 'Enviamos o link do painel para ', h('strong', { class: 'break' }, host.email))),
				h('ol', { class: 'next-steps' },
					h('li', {}, h('span', {}, 'No ', h('strong', {}, 'painel do organizador'), ', confira os participantes.')),
					h('li', {}, h('span', {}, 'Clique em ', h('strong', {}, '"Sortear agora"'), ': cada um recebe por e-mail e SMS o seu amigo secreto.')),
					h('li', {}, h('span', {}, 'Acompanhe a entrega e as listas de presentes pelo painel.'))),
			],
			actions: [
				{ label: 'Fechar', value: true, class: 'btn-ghost' },
				link && { label: 'Abrir painel', href: link, class: 'btn-primary', icon: 'clipboard2-check-fill' },
			].filter(Boolean),
		});
		resetForm();
	} catch (err) {
		console.error(`Erro ao criar evento [${err.status || '?'}]:`, err.data || err);
		setBusy(submitButton, false);
		state.saving = false;

		showMessage({
			type: 'error',
			title: err.status === 429 ? 'Muitas tentativas' : 'Não foi possível criar o evento',
			message: errorText(err),
		});
	}
});

// ── Modo de teste (?test=1): formulario ja preenchido ──

if (param('test')) {
	state.eventDate = nextDayOfYear(11, 24);
	datePicker.setDate(state.eventDate, false);
	state.amount = 100;
	amountInput.value = formatMoney(100);
	state.message = 'Ola pessoal, nosso amigo secreto foi gerado pelo SecretSanta Generator. Por favor sigam as instrucoes e boas festas!';
	messageInput.value = state.message;
	cepInput.value = '91340-110';
	lastCep = '91340110';
	state.address.cep = cepInput.value;
	Object.entries({ place: 'Salão de Festas', street: 'Avenida Túlio de Rose', number: '260', district: 'Jardim Europa', city: 'Porto Alegre', state: 'RS' })
		.forEach(([k, v]) => setAddressField(k, v));
	state.participants = [
		newPerson({ name: 'Marcio Hickstein', email: 'marcio.hickstein@gmail.com', celphone: '51984120669', profile: 'homem' }),
		newPerson({ name: 'Ana Paula Fernandes', email: 'marcio.inetsoft@gmail.com', celphone: '51984120669', profile: 'mulher' }),
		newPerson({ name: 'Leo Hickstein', email: 'hicky.kt@gmail.com', celphone: '51984120669', profile: 'crianca' }),
	];
}

renderPeople();
refresh();
