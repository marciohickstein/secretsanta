// #######################################################
// Componentes de interface: dialogos, toasts e botao "Sair"
// #######################################################

import { h, icon } from './dom.js';

const TONES = {
	success: { icon: 'check-lg', tone: 'tone-ok' },
	error: { icon: 'exclamation-triangle-fill', tone: 'tone-danger' },
	info: { icon: 'info-lg', tone: 'tone-info' },
	gift: { icon: 'gift-fill', tone: 'tone-gold' },
};

/*
 * Abre um <dialog> nativo. Retorna uma Promise com o valor do botao clicado
 * (ou null se fechado com Esc / clique fora).
 * actions: [{ label, value, class, icon, href }]
 */
export function openDialog({ type = 'error', icon: iconName, title, message, body, actions, align = 'center', onReady } = {}) {
	const tone = TONES[type] || TONES.error;
	const dialog = h('dialog', { class: 'dialog', 'aria-labelledby': 'dlg-title' });

	const buttons = (actions || [{ label: 'Entendi', value: true, class: 'btn-primary' }]).map((a) => {
		if (a.href) {
			return h('a', { class: `btn ${a.class || ''}`, href: a.href }, a.icon && icon(a.icon), a.label);
		}
		return h('button', {
			type: 'button',
			class: `btn ${a.class || ''}`,
			onClick: () => close(a.value),
		}, a.icon && icon(a.icon), a.label);
	});

	dialog.append(
		h('div', { class: `dialog-body${align === 'left' ? ' left' : ''}` },
			align !== 'left' && h('div', { class: `dialog-icon ${tone.tone}` }, icon(iconName || tone.icon)),
			h('h2', { class: 'dialog-title', id: 'dlg-title' }, title),
			message && h('p', { class: 'dialog-text' }, message),
			body,
		),
		h('div', { class: `dialog-actions${align === 'left' ? ' end' : ''}` }, buttons),
	);

	let result = null;
	const close = (value) => { result = value; dialog.close(); };

	// Clique no fundo fecha
	dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

	document.body.append(dialog);
	dialog.showModal();
	if (onReady) onReady(dialog, close);

	return new Promise((resolve) => {
		dialog.addEventListener('close', () => {
			dialog.remove();
			resolve(result);
		}, { once: true });
	});
}

export const showMessage = (options) => openDialog(options);

export const confirmDialog = (options) => openDialog({
	type: 'info',
	...options,
	actions: [
		{ label: options.cancel || 'Cancelar', value: false, class: 'btn-ghost' },
		{ label: options.confirm || 'Confirmar', value: true, class: 'btn-primary', icon: options.confirmIcon },
	],
}).then(Boolean);

/* Mensagem curta no rodape da tela */
export function toast(message, iconName = 'check-circle-fill') {
	let host = document.querySelector('.toast-host');
	if (!host) {
		host = h('div', { class: 'toast-host', role: 'status', 'aria-live': 'polite' });
		document.body.append(host);
	}

	const item = h('div', { class: 'toast' }, icon(iconName), message);
	host.append(item);
	setTimeout(() => item.remove(), 3200);
}

/* Liga/desliga o estado "carregando" de um botao */
export function setBusy(button, busy, busyLabel) {
	if (!button) return;
	if (busy) {
		button.dataset.label = button.dataset.label || button.innerHTML;
		button.disabled = true;
		button.replaceChildren(h('span', { class: 'spinner', 'aria-hidden': 'true' }), busyLabel || '');
	} else {
		button.disabled = false;
		if (button.dataset.label) button.innerHTML = button.dataset.label;
		delete button.dataset.label;
	}
}

/* Botao "Sair" na barra quando o acesso por senha esta ativo */
export function initLogout() {
	fetch('/auth/status', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
		.then((r) => r.json())
		.then((status) => {
			if (!status.enabled || !status.authenticated) return;

			const nav = document.querySelector('.topbar-nav');
			if (!nav || document.getElementById('logout-button')) return;

			const button = h('button', {
				type: 'button', id: 'logout-button', class: 'icon-btn', title: 'Sair', 'aria-label': 'Sair',
				onClick: () => fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' })
					.finally(() => window.location.replace('/login.html')),
			}, icon('box-arrow-right'));

			nav.append(button);
		})
		.catch(() => {});
}
