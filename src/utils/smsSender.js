const config = require('../config');
const logger = require('./logger');

// Envio via SMS Gateway for Android (https://sms-gate.app)
// Modo cloud: SMS_GATEWAY_URL=https://api.sms-gate.app/3rdparty/v1
// Modo local: SMS_GATEWAY_URL=http://<ip-do-celular>:8080

const TIMEOUT_MS = 10000;

function toE164Brazil(number) {
    const digits = String(number || '').replace(/\D/g, '');
    if (digits.length === 13 && digits.startsWith('55')) return `+${digits}`;
    if (digits.length !== 11) return null;
    return `+55${digits}`;
}

async function sendSms(to, subject, message) {
    const { url, username, password } = config.smsGateway;

    if (!url || !username || !password) {
        logger.error('smsSender: credenciais do SMS Gateway não configuradas', {
            url,
            username,
            password: password ? '***' : undefined
        });
        return;
    }

    const formattedNumber = toE164Brazil(to);

    if (!formattedNumber) {
        logger.error('smsSender: número de telefone inválido', { to });
        return;
    }

    try {
        const auth = Buffer.from(`${username}:${password}`).toString('base64');

        const response = await fetch(`${url.replace(/\/+$/, '')}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({
                textMessage: { text: `${subject}: ${message}` },
                phoneNumbers: [formattedNumber]
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });

        const body = await response.text();
        let data;
        try { data = JSON.parse(body); } catch { data = body; }

        if (!response.ok) {
            logger.error('smsSender: falha ao enviar SMS', {
                to: formattedNumber,
                status: response.status,
                response: data
            });
            return;
        }

        logger.info('smsSender: SMS enviado', { to: formattedNumber, id: data?.id, state: data?.state });
        return data;
    } catch (error) {
        logger.error('smsSender: falha ao enviar SMS', {
            to: formattedNumber,
            error: error.message
        });
    }
}

module.exports = { send: sendSms, toE164Brazil };
