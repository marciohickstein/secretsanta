"use strict"

require('module-alias/register');

const express = require('express');
const router = express.Router();
const WebhookController = require('@controllers/webhookController');

// Corpo bruto: a assinatura e calculada sobre o conteudo exato recebido
router.post('/resend', express.raw({ type: '*/*', limit: '256kb' }), WebhookController.resend);
router.post('/sms', express.raw({ type: '*/*', limit: '256kb' }), WebhookController.sms);

module.exports = router;
