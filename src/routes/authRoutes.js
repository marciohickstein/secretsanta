"use strict"

require('module-alias/register');

const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const config = require('@config');
const logger = require('@utils/logger');
const { isAuthenticated, checkPassword, setSessionCookie, clearSessionCookie, safeNext } = require('../middlewares/accessGate');

const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: config.access.loginAttemptsPer15Min,
	skipSuccessfulRequests: true,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	message: { error: true, message: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' },
});

router.get('/status', (req, res) => {
	res.json({ enabled: config.access.enabled, authenticated: config.access.enabled ? isAuthenticated(req) : true });
});

router.post('/login', loginLimiter, (req, res) => {
	if (!config.access.enabled)
		return res.json({ ok: true, redirect: safeNext(req.body && req.body.next) });

	if (!config.access.password)
		return res.status(503).json({ error: true, message: 'O acesso não está configurado no servidor.' });

	if (!checkPassword(req.body && req.body.password)) {
		logger.warn('Tentativa de login com senha incorreta', { ip: req.ip });
		return res.status(401).json({ error: true, message: 'Senha incorreta.' });
	}

	setSessionCookie(req, res);
	return res.json({ ok: true, redirect: safeNext(req.body && req.body.next) });
});

router.post('/logout', (req, res) => {
	clearSessionCookie(req, res);
	res.json({ ok: true });
});

module.exports = router;
