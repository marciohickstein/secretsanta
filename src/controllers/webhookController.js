"use strict"

require('module-alias/register');

const config = require('@config');
const notifications = require('@services/notificationService');
const { verifyWebhookSignature } = require('@utils/security');
const logger = require('@utils/logger');

const webhookController = {};

/* Eventos de entrega do Resend (corpo bruto para validar a assinatura) */
webhookController.resend = async (req, res) => {
	if (!config.email.webhookSecret) {
		logger.error('webhook resend: RESEND_WEBHOOK_SECRET não configurado');
		return res.status(503).json({ error: true, message: 'Webhook não configurado.' });
	}

	const valid = verifyWebhookSignature(config.email.webhookSecret, req.headers, req.body);

	if (!valid) {
		logger.warn('webhook resend: assinatura inválida');
		return res.status(401).json({ error: true, message: 'Assinatura inválida.' });
	}

	let payload;

	try {
		payload = JSON.parse(req.body.toString('utf8'));
	} catch {
		return res.status(400).json({ error: true, message: 'JSON inválido.' });
	}

	const result = await notifications.applyEmailEvent(payload);
	return res.status(200).json({ received: true, applied: result.applied });
};

module.exports = webhookController;
