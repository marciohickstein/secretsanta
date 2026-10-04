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

/*
 * Valida a assinatura de webhooks no padrao Svix (usado pelo Resend).
 * Conteudo assinado: "<svix-id>.<svix-timestamp>.<corpo bruto>", HMAC-SHA256 com o segredo (whsec_<base64>).
 */
function verifyWebhookSignature(secret, headers, rawBody, { toleranceSeconds = 300, now = Date.now() } = {}) {
	const id = headers['svix-id'];
	const timestamp = headers['svix-timestamp'];
	const signatures = headers['svix-signature'];

	if (!secret || !id || !timestamp || !signatures) return false;

	const ts = Number(timestamp);
	if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > toleranceSeconds) return false;

	const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
	const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody ?? '');
	const expected = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');

	return String(signatures)
		.split(' ')
		.map(part => part.split(',')[1])
		.some(signature => safeEqual(signature, expected));
}

module.exports = { newId, newToken, safeEqual, escapeHtml, maskContact, verifyWebhookSignature };
