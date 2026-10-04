const logger = require('./logger');
const { maskContact } = require('./security');

function sendTextMessage(to, subject, text) {
	logger.info('whatsAppSender: envio de WhatsApp não implementado', { to: maskContact(to), subject });
}

module.exports = { send: sendTextMessage };