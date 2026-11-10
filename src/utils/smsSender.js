const config = require('../config');
const logger = require('./logger');
const { maskContact } = require('./security');

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

function credentials() {
    const { url, username, password } = config.smsGateway;
    if (!url || !username || !password) return null;

    return {
        baseUrl: url.replace(/\/+$/, ''),
        auth: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    };
}

async function readBody(response) {
    const body = await response.text();
    try { return JSON.parse(body); } catch { return body; }
}

/* Motivo da falha informado pelo gateway (no topo ou por destinatario) */
function failureReason(data) {
    if (!data || typeof data !== 'object') return null;
    const recipient = (data.recipients || []).find(r => r && r.error);
    return data.reason || (recipient && recipient.error) || data.message || null;
}

/*
 * Envia um SMS pelo SMS Gateway.
 * Retorna { id, state } quando aceito pelo gateway ou { error } em caso de falha.
 */
async function sendSms(to, subject, message) {
    const gateway = credentials();

    if (!gateway) {
        const { url, username } = config.smsGateway;
        logger.error('smsSender: credenciais do SMS Gateway não configuradas', { url, username });
        return { error: 'SMS Gateway não configurado no servidor.' };
    }

    const formattedNumber = toE164Brazil(to);

    if (!formattedNumber) {
        logger.error('smsSender: número de telefone inválido', { to: maskContact(to) });
        return { error: 'Número de celular inválido (informe DDD + número).' };
    }

    try {
        const response = await fetch(`${gateway.baseUrl}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': gateway.auth
            },
            body: JSON.stringify({
                textMessage: { text: `${subject}: ${message}` },
                phoneNumbers: [formattedNumber]
            }),
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });

        const data = await readBody(response);

        if (!response.ok) {
            logger.error('smsSender: falha ao enviar SMS', {
                to: maskContact(formattedNumber),
                status: response.status,
                response: data
            });
            return { error: failureReason(data) || `O SMS Gateway recusou o envio (HTTP ${response.status}).` };
        }

        logger.info('smsSender: SMS enviado', { to: maskContact(formattedNumber), id: data?.id, state: data?.state });

        // Aceito pelo gateway; sem id nao da para acompanhar o status, mas nao e falha
        return { id: (data && data.id) || null, state: (data && data.state) || 'Pending' };
    } catch (error) {
        logger.error('smsSender: falha ao enviar SMS', {
            to: maskContact(formattedNumber),
            error: error.message
        });
        return { error: 'Não foi possível falar com o SMS Gateway.' };
    }
}

/*
 * Consulta o estado de um SMS no gateway.
 * Retorna { state, reason } (state: Pending, Processed, Sent, Delivered, Failed, Cancelled...) ou { error }.
 */
async function getSmsStatus(id) {
    const gateway = credentials();
    if (!gateway) return { error: 'SMS Gateway não configurado no servidor.' };

    const get = (path) => fetch(`${gateway.baseUrl}/${path}/${encodeURIComponent(id)}`, {
        headers: { 'Authorization': gateway.auth },
        signal: AbortSignal.timeout(TIMEOUT_MS)
    });

    try {
        // Rota documentada: /messages/{id}; versoes antigas usam /message/{id}
        let response = await get('messages');
        if (response.status === 404) response = await get('message');

        const data = await readBody(response);

        if (!response.ok) {
            logger.warn('smsSender: falha ao consultar SMS', { id, status: response.status, response: data });
            return { error: `HTTP ${response.status}` };
        }

        return { state: data && data.state, reason: failureReason(data) };
    } catch (error) {
        logger.warn('smsSender: falha ao consultar SMS', { id, error: error.message });
        return { error: error.message };
    }
}

module.exports = { send: sendSms, getStatus: getSmsStatus, toE164Brazil };
