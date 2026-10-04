const { Resend } = require('resend');
const config = require('../config');
const logger = require('./logger');
const { maskContact } = require('./security');

const resend = config.email.apiKey ? new Resend(config.email.apiKey) : null;

/*
 * Envia um e-mail pelo Resend.
 * Retorna { id } quando aceito pelo Resend ou { error } em caso de falha.
 */
async function sendEmail(to, subject, html) {
    const from = config.email.from;

    if (!config.email.apiKey || !from) {
        logger.error('emailSender: credenciais de e-mail não configuradas', {
            from,
            apiKey: config.email.apiKey ? '***' : undefined
        });
        return { error: 'Envio de e-mail não configurado no servidor.' };
    }

    try {
        const { data, error } = await resend.emails.send({ from, to, subject, html });

        if (error) {
            logger.error('emailSender: falha ao enviar e-mail', {
                to: maskContact(to),
                subject,
                error: error.message,
                name: error.name
            });
            return { error: error.message || 'Falha ao enviar e-mail.' };
        }

        logger.info('emailSender: e-mail enviado', { to: maskContact(to), subject, messageId: data?.id });
        return { id: data?.id };
    } catch (err) {
        logger.error('emailSender: falha ao enviar e-mail', {
            to: maskContact(to),
            subject,
            error: err.message
        });
        return { error: err.message || 'Falha ao enviar e-mail.' };
    }
}

/*
 * Consulta no Resend o ultimo evento de um e-mail enviado.
 * Retorna { lastEvent } (ex.: 'delivered', 'bounced') ou { error }.
 */
async function getEmailStatus(id) {
    if (!resend) return { error: 'Envio de e-mail não configurado no servidor.' };

    try {
        const { data, error } = await resend.emails.get(id);

        if (error) {
            logger.warn('emailSender: falha ao consultar status do e-mail', { messageId: id, error: error.message });
            return { error: error.message };
        }

        return { lastEvent: data && data.last_event };
    } catch (err) {
        logger.warn('emailSender: falha ao consultar status do e-mail', { messageId: id, error: err.message });
        return { error: err.message };
    }
}

module.exports = { send: sendEmail, getStatus: getEmailStatus };
