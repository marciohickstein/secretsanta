const logger = require('./logger');

function sendTextMessage(to, subject, text) {
	logger.info('whatsAppSender: envio de WhatsApp não implementado', { to, subject });
}

module.exports = { send: sendTextMessage };