// #######################################################
// Painel do organizador (painel.html?event=...&token=...)
// Nunca exibe quem tirou quem nem o conteudo das listas.
// #######################################################

import { $, h, icon, mount, param } from '../lib/dom.js';
import { organizer, errorText } from '../lib/api.js';
import { openDialog, showMessage, confirmDialog, toast, initLogout } from '../lib/ui.js';
import { formatDateTime, formatTime, PROFILES, profileLabel, onlyDigits } from '../lib/format.js';

initLogout();

// Status do ultimo e-mail enviado ao participante
const EMAIL_STATUS = {
	sending: { label: 'Enviando...', icon: 'hourglass-split', css: '' },
	sent: { label: 'Enviado', icon: 'send-check', css: 'pill-info' },
	delayed: { label: 'Entrega atrasada', icon: 'clock-history', css: 'pill-warn' },
	delivered: { label: 'Entregue', icon: 'check2-circle', css: 'pill-ok' },
	opened: { label: 'Aberto', icon: 'envelope-open', css: 'pill-ok' },
	clicked: { label: 'Link acessado', icon: 'hand-index-thumb', css: 'pill-ok' },
	bounced: { label: 'Devolvido', icon: 'x-octagon-fill', css: 'pill-danger' },
	failed: { label: 'Falha no envio', icon: 'x-octagon-fill', css: 'pill-danger' },
	complained: { label: 'Marcado como spam', icon: 'flag-fill', css: 'pill-danger' },
	suppressed: { label: 'Endereço bloqueado', icon: 'slash-circle', css: 'pill-danger' },
};

// Status do ultimo SMS enviado ao participante
const SMS_STATUS = {
	sending: { label: 'Enviando...', icon: 'hourglass-split', css: '' },
	queued: { label: 'Na fila do celular', icon: 'phone-vibrate', css: 'pill-warn', hint: 'O celular do SMS Gateway ainda não enviou. Confira se ele está ligado, com o app aberto e sem economia de bateria.' },
	sent: { label: 'Enviado', icon: 'send-check', css: 'pill-info' },
	delivered: { label: 'Entregue', icon: 'check2-circle', css: 'pill-ok' },
	failed: { label: 'Falha no envio', icon: 'x-octagon-fill', css: 'pill-danger' },
};

const WAITING = { label: 'Aguardando sorteio', icon: 'hourglass', css: '' };
const NOT_SENT = { label: 'Não enviado', icon: 'dash-circle', css: '' };

const SMS_PENDING = ['sending', 'queued', 'sent'];
const DELIVERED = ['delivered', 'opened', 'clicked'];
const PROBLEMS = ['bounced', 'failed', 'complained', 'suppressed'];
const PENDING = ['sending', 'sent', 'delayed'];
const REFRESH_MS = 10000;

const eventId = param('event');
const token = param('token');
const api = organizer(eventId, token);
const root = $('#panel');

let data = null;
let loading = false;
let busy = false;

// ── Regras de status ──

const emailStatus = (p) => {
	if (p.emailStatus) return EMAIL_STATUS[p.emailStatus.status] || EMAIL_STATUS.sent;
	return !data.event.drawn && !p.isHost ? WAITING : NOT_SENT;
};

const smsStatus = (p) => {
	if (p.smsStatus) return SMS_STATUS[p.smsStatus.status] || SMS_STATUS.sent;
	if (!p.celphone) return { label: 'Sem celular', icon: 'phone', css: '' };
	return !data.event.drawn && !p.isHost ? WAITING : NOT_SENT;
};

const smsNumberChanged = (p) => p.smsStatus && p.smsStatus.sentTo && onlyDigits(p.smsStatus.sentTo) !== onlyDigits(p.celphone);

const kindLabel = (kind) => kind === 'organizer' ? 'Link do painel' : 'Resultado do sorteio';

const hasPending = () => data && data.participants.some((p) =>
	(p.emailStatus && PENDING.includes(p.emailStatus.status))
	|| (p.smsStatus && SMS_PENDING.includes(p.smsStatus.status)));

const summarize = (participants) => ({
	total: participants.length,
	delivered: participants.filter((p) => p.emailStatus && DELIVERED.includes(p.emailStatus.status)).length,
	problems: participants.filter((p) => p.emailStatus && PROBLEMS.includes(p.emailStatus.status)).length,
	wishlists: participants.filter((p) => p.wishlistItems > 0).length,
	smsTotal: participants.filter((p) => p.celphone).length,
	smsDelivered: participants.filter((p) => p.smsStatus && p.smsStatus.status === 'delivered').length,
	smsProblems: participants.filter((p) => p.smsStatus && p.smsStatus.status === 'failed').length,
});

// ── Renderizacao ──

const pill = (status, title) => h('span', { class: ['pill', status.css], title }, icon(status.icon), status.label);

const fact = (iconName, label, ...value) => h('div', { class: 'fact' },
	h('div', { class: 'fact-k' }, icon(iconName), label),
	h('div', { class: 'fact-v' }, ...value));

const stat = (iconName, tone, value, label) => h('div', { class: 'stat' },
	h('div', { class: `stat-icon ${tone}` }, icon(iconName)),
	h('div', {}, h('div', { class: 'stat-value' }, value), h('div', { class: 'stat-label' }, label)));

function renderError(message) {
	mount(root, h('div', { class: 'solo' },
		h('div', { class: 'card card-pad solo-card', style: 'text-align:center' },
			h('div', { class: 'dialog-icon tone-danger' }, icon('shield-lock-fill')),
			h('h2', { class: 'dialog-title' }, 'Não foi possível abrir o painel'),
			h('p', { class: 'dialog-text' }, message),
			h('a', { class: 'btn btn-primary', href: 'event.html', style: 'margin-top:24px' }, icon('house-fill'), 'Voltar ao início'))));
}

function render() {
	const { event, participants, smsEnabled, emailEnabled } = data;
	const now = Date.now();
	const s = summarize(participants);

	const statusBadge = event.drawn
		? h('span', { class: 'pill pill-ok' }, icon('check-circle-fill'), `Sorteado em ${formatDateTime(event.drawnAt)}`)
		: h('span', { class: 'pill pill-warn' }, icon('hourglass-split'), 'Aguardando sorteio');

	const eventCard = h('section', { class: 'card', style: 'margin-bottom:20px' },
		h('div', { class: 'card-head' }, h('h2', { class: 'card-title' }, 'Evento'), h('span', { class: 'spacer' }), statusBadge),
		h('div', { class: 'card-pad' },
			h('div', { class: 'facts' },
				fact('calendar-event', 'Data', event.date || '—'),
				fact('geo-alt', 'Local', event.location || '—',
					event.mapUrl && h('div', {}, h('a', { href: event.mapUrl, target: '_blank', rel: 'noopener noreferrer' }, icon('map'), ' Ver no mapa'))),
				fact('cash-coin', 'Valor máx.', event.amount || '—'),
				fact('people', 'Participantes', `${participants.length} pessoas`)),
			!event.drawn && h('div', { class: 'callout', style: 'margin-top:20px' },
				h('div', {},
					h('strong', {}, 'Tudo pronto para o sorteio?'),
					h('span', { class: 'small muted' }, `Confira os dados abaixo. Ao sortear, cada participante recebe por e-mail${smsEnabled ? ' e SMS' : ''} o nome do seu amigo secreto.`)),
				h('button', { type: 'button', class: 'btn btn-primary btn-lg', disabled: busy, onClick: confirmDraw }, icon('shuffle'), 'Sortear agora'))));

	const stats = h('div', { class: 'stats', style: 'margin-bottom:20px' },
		stat('envelope-check-fill', 'tone-ok', `${s.delivered}/${s.total}`, 'E-mails entregues'),
		stat('exclamation-octagon-fill', s.problems ? 'tone-danger' : 'tone-muted', String(s.problems), 'E-mails com problema'),
		smsEnabled && stat('chat-dots-fill', s.smsProblems ? 'tone-danger' : 'tone-info', `${s.smsDelivered}/${s.smsTotal}`,
			`SMS entregues${s.smsProblems ? ` · ${s.smsProblems} com problema` : ''}`),
		stat('bag-heart-fill', 'tone-gold', `${s.wishlists}/${s.total}`, 'Listas preenchidas'));

	const rows = participants.map((p) => {
		const es = emailStatus(p);
		const ss = smsStatus(p);
		const emailWait = p.resendAvailableAt > now;
		const smsWait = p.smsResendAvailableAt > now;

		return h('li', { class: 'prow' },
			h('div', { style: 'min-width:0' },
				h('div', { class: 'prow-name' },
					p.name,
					p.isHost && h('span', { class: 'pill pill-gold' }, icon('star-fill'), 'Organizador'),
					p.profile
						? h('span', { class: 'pill' }, profileLabel(p.profile))
						: h('span', { class: 'pill pill-warn', title: 'Edite para informar o perfil e melhorar as sugestões de presente' }, 'Sem perfil')),
				h('div', { class: 'prow-meta' }, p.email),
				p.celphone && h('div', { class: 'prow-meta' }, icon('phone'), ' ', p.celphone),
				h('div', { style: 'margin-top:8px' },
					p.wishlistItems > 0
						? h('span', { class: 'pill pill-ok' }, icon('bag-check'), `Lista: ${p.wishlistItems} ${p.wishlistItems === 1 ? 'item' : 'itens'}`)
						: h('span', { class: 'pill' }, icon('bag'), 'Lista ainda vazia'))),
			h('div', {},
				h('div', { class: 'prow-k' }, 'E-mail'),
				pill(es),
				p.emailStatus && h('div', { class: 'prow-note' }, `${kindLabel(p.emailStatus.kind)} · ${formatDateTime(p.emailStatus.updatedAt || p.emailStatus.sentAt)}`),
				p.emailStatus && p.emailStatus.error && h('div', { class: 'prow-note danger' }, p.emailStatus.error),
				p.emailStatus && p.emailStatus.sentTo && p.emailStatus.sentTo !== p.email
					&& h('div', { class: 'prow-note warn' }, `Enviado para ${p.emailStatus.sentTo} (e-mail alterado depois)`)),
			smsEnabled && h('div', {},
				h('div', { class: 'prow-k' }, 'SMS'),
				pill(ss, ss.hint),
				p.smsStatus && h('div', { class: 'prow-note' }, `${kindLabel(p.smsStatus.kind)} · ${formatDateTime(p.smsStatus.updatedAt || p.smsStatus.sentAt)}`),
				p.smsStatus && p.smsStatus.status === 'queued' && h('div', { class: 'prow-note warn' }, ss.hint),
				p.smsStatus && p.smsStatus.error && h('div', { class: 'prow-note danger' }, p.smsStatus.error),
				smsNumberChanged(p) && h('div', { class: 'prow-note warn' }, `Enviado para ${p.smsStatus.sentTo} (celular alterado depois)`)),
			h('div', { class: 'prow-actions' },
				h('button', { type: 'button', class: 'btn btn-sm', disabled: busy, title: 'Corrigir dados', onClick: () => openEdit(p) }, icon('pencil-square'), 'Editar'),
				p.canResend && h('button', {
					type: 'button', class: 'btn btn-sm', disabled: busy || emailWait,
					title: emailWait ? `Disponível às ${formatTime(p.resendAvailableAt)}` : 'Reenviar e-mail',
					onClick: () => resend(p, 'email'),
				}, icon('send-fill'), 'E-mail'),
				smsEnabled && p.canResendSms && h('button', {
					type: 'button', class: 'btn btn-sm', disabled: busy || smsWait, 'aria-label': 'Reenviar SMS',
					title: smsWait ? `Disponível às ${formatTime(p.smsResendAvailableAt)}` : 'Reenviar SMS',
					onClick: () => resend(p, 'sms'),
				}, icon('chat-dots-fill'), 'SMS')));
	});

	const list = h('section', { class: 'card' },
		h('div', { class: 'card-head' },
			h('h2', { class: 'card-title' }, 'Participantes'),
			h('span', { class: 'spacer' }),
			h('button', { type: 'button', class: 'icon-btn', title: 'Atualizar', 'aria-label': 'Atualizar', onClick: load },
				icon('arrow-clockwise', loading ? 'spin' : ''))),
		h('div', { class: ['plist-head', !smsEnabled && 'no-sms'], 'aria-hidden': 'true' },
			h('span', {}, 'Participante'), h('span', {}, 'E-mail'), smsEnabled && h('span', {}, 'SMS'), h('span', { class: 'end' }, 'Ações')),
		h('ul', { class: ['plist', !smsEnabled && 'no-sms'] }, rows));

	mount(root,
		eventCard,
		stats,
		!emailEnabled && h('div', { class: 'note note-warn', role: 'alert', style: 'margin-bottom:20px' },
			icon('exclamation-triangle-fill'), h('div', {}, 'O envio de e-mails está desativado no servidor. Os status e reenvios não estão disponíveis.')),
		list,
		h('div', { class: 'note note-tip', role: 'note', style: 'margin-top:20px' },
			icon('lightbulb-fill'),
			h('div', { class: 'small' },
				h('strong', {}, 'Guarde este link: '), 'ele é o seu acesso ao painel e também está no e-mail que você recebeu. ',
				'Para manter a surpresa (inclusive a sua!), o painel não mostra quem tirou quem nem o conteúdo das listas. ',
				'Se um e-mail ou SMS falhar, corrija os dados em ', h('strong', {}, 'Editar'), ' e reenvie.')));
}

// ── Acoes ──

async function load() {
	if (!eventId || !token) {
		renderError('O link está incompleto. Use o link "Abrir painel do organizador" do e-mail que você recebeu.');
		return;
	}

	loading = true;
	if (data) render();

	try {
		data = await api.get();
	} catch (err) {
		if (err.status === 403 || err.status === 404) {
			data = null;
			renderError('Este link não é válido. Confira se copiou o link completo do e-mail do organizador.');
			return;
		}
		if (!data) renderError(errorText(err));
	} finally {
		loading = false;
	}

	if (data) render();
}

async function run(action) {
	busy = true;
	render();
	try {
		return await action();
	} finally {
		busy = false;
		if (data) render();
	}
}

async function confirmDraw() {
	const ok = await confirmDialog({
		type: 'gift',
		icon: 'shuffle',
		title: 'Sortear agora?',
		message: `Cada um dos ${data.participants.length} participantes vai receber o nome do seu amigo secreto. O sorteio não pode ser desfeito.`,
		cancel: 'Ainda não',
		confirm: 'Sim, sortear!',
		confirmIcon: 'shuffle',
	});
	if (!ok) return;

	try {
		data = await run(() => api.draw());
		showMessage({
			type: 'success',
			title: 'Sorteio realizado! 🎉',
			message: data.smsEnabled
				? 'Os e-mails e SMS estão sendo enviados agora. Acompanhe a entrega de cada um aqui no painel.'
				: 'Os e-mails estão sendo enviados agora. Acompanhe a entrega de cada um aqui no painel.',
			actions: [{ label: 'Ótimo!', value: true, class: 'btn-primary' }],
		});
	} catch (err) {
		showMessage({ type: 'error', title: 'Não foi possível sortear', message: errorText(err) });
		load();
	}
}

async function resend(p, channel) {
	const isSms = channel === 'sms';
	try {
		data = await run(() => api.resend(p.id, channel));
		toast(isSms ? `Novo SMS enviado para ${p.name}` : `Novo e-mail enviado para ${p.name}`, 'send-check');
	} catch (err) {
		showMessage({ type: 'error', title: 'Não foi possível reenviar', message: errorText(err) });
	}
}

function openEdit(p) {
	const edit = { name: p.name || '', email: p.email || '', celphone: p.celphone || '', profile: p.profile || '' };
	const field = (id, label, key, props) => h('div', { class: 'field', style: 'margin-top:14px' },
		h('label', { class: 'label', for: id }, label),
		h('input', { id, class: 'input', value: edit[key], onInput: (e) => { edit[key] = e.target.value; }, ...props }));

	const body = h('div', { style: 'margin-top:8px' },
		field('edit_name', 'Nome', 'name', { type: 'text', maxLength: 100, required: true }),
		field('edit_email', 'E-mail', 'email', { type: 'email', maxLength: 254, required: true }),
		field('edit_celphone', 'Celular', 'celphone', { type: 'tel', maxLength: 20 }),
		h('div', { class: 'field', style: 'margin-top:14px' },
			h('span', { class: 'label', id: 'edit_profile_label' }, 'Perfil'),
			h('div', { class: 'seg', role: 'radiogroup', 'aria-labelledby': 'edit_profile_label', style: 'align-self:flex-start' },
				PROFILES.map((opt) => h('label', {},
					h('input', { type: 'radio', name: 'edit_profile', value: opt.value, checked: edit.profile === opt.value, onChange: () => { edit.profile = opt.value; } }),
					h('span', {}, icon(opt.icon), opt.label)))),
			h('span', { class: 'hint' }, 'Usado para sugerir presentes a quem tirar esta pessoa.')),
		p.canResend && h('p', { class: 'hint', style: 'margin-top:14px' }, icon('info-circle'), ' Depois de salvar, use ', h('strong', {}, 'Reenviar'), ' para mandar a mensagem para o dado corrigido.'));

	openDialog({
		align: 'left',
		title: 'Corrigir participante',
		body,
		actions: [
			{ label: 'Cancelar', value: false, class: 'btn-ghost' },
			{ label: 'Salvar', value: 'save', class: 'btn-primary', icon: 'check-lg' },
		],
		onReady: (dialog) => { const first = dialog.querySelector('#edit_name'); if (first) first.focus(); },
	}).then(async (result) => {
		if (result !== 'save') return;

		if (!edit.name.trim() || !edit.email.trim()) {
			showMessage({ type: 'error', title: 'Quase lá!', message: 'Informe o nome e um e-mail válido.' });
			return;
		}

		try {
			data = await run(() => api.update(p.id, {
				name: edit.name.trim(), email: edit.email.trim(), celphone: edit.celphone.trim(), profile: edit.profile,
			}));
			toast('Dados atualizados');
		} catch (err) {
			showMessage({ type: 'error', title: 'Não foi possível salvar', message: errorText(err) });
		}
	});
}

// Atualiza automaticamente enquanto houver e-mails ou SMS a caminho
// (e re-renderiza para liberar os botoes de reenvio quando o intervalo acabar)
setInterval(() => {
	if (!data || busy || document.querySelector('dialog[open]')) return;
	if (hasPending() && !loading) load();
	else render();
}, REFRESH_MS);

load();
