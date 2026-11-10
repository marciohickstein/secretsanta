"use strict"

require('module-alias/register');

const config = require('@config');
const notifications = require('@services/notificationService');
const smsNotifications = require('@services/smsNotificationService');
const { verifyWebhookSignature, verifySmsGatewaySignature } = require('@utils/security');
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

/* Eventos de SMS (sms:sent, sms:delivered, sms:failed) enviados pelo celular do SMS Gateway */
webhookController.sms = async (req, res) => {
	if (!config.smsGateway.webhookKey) {
		logger.error('webhook sms: SMS_GATEWAY_WEBHOOK_KEY não configurado');
		return res.status(503).json({ error: true, message: 'Webhook não configurado.' });
	}

	if (!verifySmsGatewaySignature(config.smsGateway.webhookKey, req.headers, req.body)) {
		logger.warn('webhook sms: assinatura inválida');
		return res.status(401).json({ error: true, message: 'Assinatura inválida.' });
	}

	let payload;

	try {
		payload = JSON.parse(req.body.toString('utf8'));
	} catch {
		return res.status(400).json({ error: true, message: 'JSON inválido.' });
	}

	const result = await smsNotifications.applySmsEvent(payload);
	return res.status(200).json({ received: true, applied: result.applied });
};

module.exports = webhookController;
