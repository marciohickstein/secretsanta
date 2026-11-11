// #######################################################
// Utilitarios de DOM
// Todo texto vindo do servidor ou do usuario entra como textContent
// (nunca innerHTML) e links passam por safeUrl.
// #######################################################

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export const param = (name) => new URLSearchParams(window.location.search).get(name);

/* Aceita apenas links http(s); qualquer outro esquema (javascript:, data:...) vira null */
export const safeUrl = (url) => {
	if (!url) return null;
	try {
		const parsed = new URL(String(url), window.location.origin);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : null;
	} catch {
		return null;
	}
};

const PROPS = new Set(['value', 'checked', 'disabled', 'selected', 'hidden', 'type', 'name', 'id', 'placeholder', 'maxLength', 'required', 'autocomplete', 'inputMode', 'htmlFor', 'title', 'rows']);

/*
 * Cria um elemento: h('a', { class: 'btn', href, onClick }, 'texto', filho, [lista])
 * Strings e numeros viram nos de texto; null/false/undefined sao ignorados.
 */
export function h(tag, props = {}, ...children) {
	const el = document.createElement(tag);

	for (const [key, value] of Object.entries(props || {})) {
		if (value === undefined || value === null || value === false) continue;

		if (key === 'class') el.className = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
		else if (key === 'text') el.textContent = value;
		else if (key === 'dataset') Object.assign(el.dataset, value);
		else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
		else if (key === 'href' || key === 'src') {
			const url = safeUrl(value);
			if (url) el.setAttribute(key, url);
		}
		else if (PROPS.has(key)) el[key] = value;
		else el.setAttribute(key, value === true ? '' : String(value));
	}

	append(el, children);
	return el;
}

function append(el, children) {
	for (const child of children) {
		if (child === null || child === undefined || child === false) continue;
		if (Array.isArray(child)) append(el, child);
		else el.append(child instanceof Node ? child : document.createTextNode(String(child)));
	}
}

export const icon = (name, extra = '') => h('i', { class: `bi bi-${name}${extra ? ` ${extra}` : ''}`, 'aria-hidden': 'true' });

export const spinner = (extra = '') => h('span', { class: `spinner${extra ? ` ${extra}` : ''}`, 'aria-hidden': 'true' });

/* Substitui o conteudo de um elemento */
export const mount = (el, ...children) => {
	el.replaceChildren();
	append(el, children);
	return el;
};
