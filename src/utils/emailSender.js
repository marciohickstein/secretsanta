const config = require('../config');
const nodemailer = require('nodemailer');
const logger = require('./logger');

var smtpTransport = require('nodemailer-smtp-transport');

const transporter = nodemailer.createTransport(smtpTransport({
    service: config.email.service,
    host: config.email.host,
    port: config.email.port,
    tls: {
        rejectUnauthorized: false
    },
    auth: {
        user: config.email.user,
        pass: config.email.pass
    }
}));

function sendEmail(to, subject, text) {
    const from = config.email.from;

    if (!config.email.user || !config.email.pass || !from) {
        logger.error('emailSender: credenciais de e-mail não configuradas', {
            service: config.email.service,
            host: config.email.host,
            from,
            user: config.email.user ? '***' : undefined
        });
        return;
    }

    const mailOptions = { from, to, subject, html: text };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            logger.error('emailSender: falha ao enviar e-mail', {
                to,
                subject,
                error: err.message,
                code: err.code,
                responseCode: err.responseCode
            });
            return;
        }
        logger.info('emailSender: e-mail enviado', { to, subject, messageId: info.messageId });
    });
}

module.exports = { send: sendEmail };