const { Resend } = require('resend');
const config = require('../config');
const logger = require('./logger');

const resend = config.email.apiKey ? new Resend(config.email.apiKey) : null;

async function sendEmail(to, subject, html) {
    const from = config.email.from;

    if (!config.email.apiKey || !from) {
        logger.error('emailSender: credenciais de e-mail não configuradas', {
            from,
            apiKey: config.email.apiKey ? '***' : undefined
        });
        return;
    }

    try {
        const { data, error } = await resend.emails.send({ from, to, subject, html });

        if (error) {
            logger.error('emailSender: falha ao enviar e-mail', {
                to,
                subject,
                error: error.message,
                name: error.name
            });
            return;
        }

        logger.info('emailSender: e-mail enviado', { to, subject, messageId: data?.id });
    } catch (err) {
        logger.error('emailSender: falha ao enviar e-mail', {
            to,
            subject,
            error: err.message
        });
    }
}

module.exports = { send: sendEmail };
