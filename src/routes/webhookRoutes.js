"use strict"

require('module-alias/register');

const express = require('express');
const router = express.Router();
const WebhookController = require('@controllers/webhookController');

// Corpo bruto: a assinatura e calculada sobre o conteudo exato recebido
router.use(express.raw({ type: '*/*', limit: '256kb' }));

router.post('/resend', WebhookController.resend);
router.post('/sms', WebhookController.sms);

module.exports = router;
