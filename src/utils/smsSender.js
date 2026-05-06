const config = require('@config');
const twilio = require("twilio");
const logger = require('./logger');

function toE164Brazil(number) {
    const digits = number.replace(/\D/g, "");
    if (digits.length !== 11) return null;
    return `+55${digits}`;
}

async function sendSms(to, subject, message) {
    const accountSid = config.twilio.sid;
    const authToken = config.twilio.token;
    const twilioNumber = config.twilio.from;

    if (!accountSid || !authToken || !twilioNumber) {
        logger.error('smsSender: credenciais Twilio não configuradas', {
            sid: accountSid ? '***' : undefined,
            from: twilioNumber
        });
        return;
    }

    const formattedNumber = toE164Brazil(to);

    if (!formattedNumber) {
        logger.error('smsSender: número de telefone inválido', { to });
        return;
    }

    try {
        const client = twilio(accountSid, authToken);
        const fullMessage = `${subject}: ${message}`;

        const response = await client.messages.create({
            body: fullMessage,
            from: twilioNumber,
            to: formattedNumber
        });

        logger.info('smsSender: SMS enviado', { to: formattedNumber, sid: response.sid });
        return response;
    } catch (error) {
        logger.error('smsSender: falha ao enviar SMS', {
            to: formattedNumber,
            error: error.message,
            code: error.code,
            status: error.status
        });
    }
}

module.exports = { send: sendSms };
