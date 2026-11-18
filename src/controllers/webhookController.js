"use strict"

require('module-alias/register');

const config = require('@config');
const notifications = require('@services/notificationService');
const smsNotifications = require('@services/smsNotificationService');
const { verifyWebhookSignature, verifySmsGatewaySignature, rawBodyText } = require('@utils/security');
const logger = require('@utils/logger');

/*
 * Webhook de entrega: segredo configurado (503), assinatura valida (401), JSON valido (400), aplica o evento.
 * secret e lido a cada requisicao (a configuracao pode mudar nos testes).
 */
const webhookHandler = ({ name, envVar, secret, verify, apply }) => async (req, res) => {
	const key = secret();

	if (!key) {
		logger.error(`webhook ${name}: ${envVar} não configurado`);
		return res.status(503).json({ error: true, message: 'Webhook não configurado.' });
	}

	if (!verify(key, req.headers, req.body)) {
		logger.warn(`webhook ${name}: assinatura inválida`);
		return res.status(401).json({ error: true, message: 'Assinatura inválida.' });
	}

	let payload;

	try {
		payload = JSON.parse(rawBodyText(req.body));
	} catch {
		return res.status(400).json({ error: true, message: 'JSON inválido.' });
	}

	const result = await apply(payload);
	return res.status(200).json({ received: true, applied: result.applied });
};

module.exports = {
	/* Eventos de entrega do Resend (corpo bruto para validar a assinatura) */
	resend: webhookHandler({
		name: 'resend',
		envVar: 'RESEND_WEBHOOK_SECRET',
		secret: () => config.email.webhookSecret,
		verify: verifyWebhookSignature,
		apply: notifications.applyEmailEvent,
	}),

	/* Eventos de SMS (sms:sent, sms:delivered, sms:failed) enviados pelo celular do SMS Gateway */
	sms: webhookHandler({
		name: 'sms',
		envVar: 'SMS_GATEWAY_WEBHOOK_KEY',
		secret: () => config.smsGateway.webhookKey,
		verify: verifySmsGatewaySignature,
		apply: smsNotifications.applySmsEvent,
	}),
};
