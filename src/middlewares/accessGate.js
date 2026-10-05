"use strict"

const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');
const { safeEqual } = require('../utils/security');

const COOKIE_NAME = 'ss_access';

/*
 * Rotas liberadas sem senha. Todo o resto exige login (negar por padrao).
 * Os links enviados por e-mail continuam funcionando: eles ja sao protegidos por tokens secretos.
 */
const PUBLIC_PAGES = new Set(['/login.html', '/error404.html', '/painel.html', '/wishlist.html', '/crudWishlist.html']);
const PUBLIC_PREFIXES = ['/assets/', '/libs/', '/auth/', '/webhooks/', '/participant/', '/wishlist/'];

function isPublic(req) {
	const path = req.path;

	if (PUBLIC_PAGES.has(path)) return true;
	if (PUBLIC_PREFIXES.some(prefix => path.startsWith(prefix))) return true;

	// Evento: consulta publica, links antigos de sorteio e painel do organizador (com token)
	// A criacao (POST /event) exige login
	if (/^\/event\/[^/]+(\/.*)?$/.test(path)) return true;

	return false;
}

/* Chave das sessoes derivada da senha: trocar a senha encerra todas as sessoes */
const sessionKey = () => crypto.createHash('sha256').update(`secretsanta-access:${config.access.password}`).digest();

const sign = (expiresAt) => crypto.createHmac('sha256', sessionKey()).update(String(expiresAt)).digest('base64url');

function createSessionValue() {
	const expiresAt = Date.now() + config.access.sessionDays * 24 * 60 * 60 * 1000;
	return { value: `${expiresAt}.${sign(expiresAt)}`, maxAge: expiresAt - Date.now() };
}

function readCookie(req, name) {
	const header = req.headers.cookie || '';

	for (const part of header.split(';')) {
		const index = part.indexOf('=');
		if (index > 0 && part.slice(0, index).trim() === name) {
			try {
				return decodeURIComponent(part.slice(index + 1).trim());
			} catch {
				return null;
			}
		}
	}

	return null;
}

function isAuthenticated(req) {
	if (!config.access.password) return false;

	const value = readCookie(req, COOKIE_NAME);
	if (!value) return false;

	const [expiresAt, signature] = value.split('.');
	if (!expiresAt || !signature || Number(expiresAt) < Date.now()) return false;

	return safeEqual(signature, sign(expiresAt));
}

/* Compara a senha sem vazar o tamanho (hash) e em tempo constante */
function checkPassword(password) {
	if (!config.access.password || typeof password !== 'string') return false;

	const hash = (value) => crypto.createHash('sha256').update(value).digest('base64');
	return safeEqual(hash(password), hash(config.access.password));
}

function setSessionCookie(req, res) {
	const { value, maxAge } = createSessionValue();

	res.cookie(COOKIE_NAME, value, {
		httpOnly: true,
		sameSite: 'lax',
		secure: req.secure,
		maxAge,
		path: '/',
	});
}

function clearSessionCookie(req, res) {
	res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: req.secure, path: '/' });
}

/* Link de retorno apos o login: apenas caminhos locais */
function safeNext(next) {
	return typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}

let warnedMissingPassword = false;

function accessGate(req, res, next) {
	if (!config.access.enabled || isPublic(req) || isAuthenticated(req)) return next();

	if (!config.access.password && !warnedMissingPassword) {
		logger.error('ACCESS_GATE_ENABLED=true, mas ACCESS_PASSWORD não foi definida: o acesso ficará bloqueado');
		warnedMissingPassword = true;
	}

	if (req.method === 'GET' && req.accepts(['html', 'json']) === 'html') {
		return res.redirect(302, `/login.html?next=${encodeURIComponent(req.originalUrl)}`);
	}

	return res.status(401).json({ error: true, message: 'Acesso restrito. Faça login para continuar.' });
}

module.exports = { accessGate, isAuthenticated, checkPassword, setSessionCookie, clearSessionCookie, safeNext };
