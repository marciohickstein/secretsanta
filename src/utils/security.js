"use strict"

const crypto = require('crypto');

const newId = () => crypto.randomUUID();

const newToken = () => crypto.randomBytes(24).toString('base64url');

/* Comparacao em tempo constante para tokens */
function safeEqual(a, b) {
	if (typeof a !== 'string' || typeof b !== 'string') return false;

	const bufA = Buffer.from(a);
	const bufB = Buffer.from(b);

	return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

const escapeHtml = (value) => String(value ?? '')
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;')
	.replace(/'/g, '&#39;');

/* Oculta parte do e-mail/telefone nos logs: fulano@x.com -> fu***@x.com */
function maskContact(value) {
	const str = String(value ?? '');
	const at = str.indexOf('@');

	if (at > 0) return `${str.slice(0, Math.min(2, at))}***${str.slice(at)}`;
	if (str.length > 4) return `***${str.slice(-4)}`;

	return '***';
}

module.exports = { newId, newToken, safeEqual, escapeHtml, maskContact };
