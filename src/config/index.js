"use strict"

require('dotenv').config({ quiet: true });

const PORT_DEFAULT = 3333;

const config = {
	app: {
		port: process.env.PORT || PORT_DEFAULT,
		// URL publica usada nos links enviados por e-mail/SMS (ex.: https://amigosecreto.com.br)
		url: process.env.APP_URL ? process.env.APP_URL.replace(/\/+$/, '') : '',
		// Proxies confiaveis para obter o IP real (X-Forwarded-For). Padrao: nginx na mesma maquina
		trustProxy: process.env.TRUST_PROXY || 'loopback',
	},
	limits: {
		minParticipants: 3,
		maxParticipants: 50,
		maxWishlistItems: 50,
		// Criacao de eventos por IP a cada hora
		eventsPerHour: Number(process.env.RATE_LIMIT_EVENTS_PER_HOUR) || 10,
		// Requisicoes a API por IP a cada 15 minutos
		apiRequestsPer15Min: Number(process.env.RATE_LIMIT_API_PER_15MIN) || 300,
	},
	database: {
		file: process.env.TEST ? ':memory:' : (process.env.DB_FILE || 'data/secretsanta.db'),
	},
	notifications: {
		email:    process.env.NOTIFY_EMAIL    !== 'false',
		whatsapp: process.env.NOTIFY_WHATSAPP === 'true',
		sms:      process.env.NOTIFY_SMS      === 'true',
	},
	smsGateway: {
		url: process.env.SMS_GATEWAY_URL || 'https://api.sms-gate.app/3rdparty/v1',
		username: process.env.SMS_GATEWAY_USERNAME,
		password: process.env.SMS_GATEWAY_PASSWORD,
	},
	email: {
		from: process.env.RESEND_FROM,
		apiKey: process.env.RESEND_API_KEY,
		// Segredo do webhook do Resend (whsec_...), usado para validar os eventos de entrega
		webhookSecret: process.env.RESEND_WEBHOOK_SECRET,
		// Intervalo minimo entre envios (o Resend limita a quantidade de requisicoes por segundo)
		minIntervalMs: process.env.TEST ? 0 : (Number(process.env.EMAIL_MIN_INTERVAL_MS) || 600),
		// Intervalo minimo entre consultas de status ao Resend para o mesmo e-mail (alternativa ao webhook)
		statusCheckIntervalMs: process.env.TEST ? 0 : 30 * 1000,
		// Depois deste tempo o status deixa de ser consultado
		statusCheckMaxAgeMs: 3 * 24 * 60 * 60 * 1000,
		// Tempo minimo entre reenvios para o mesmo participante
		resendCooldownMs: 10 * 60 * 1000,
	},
	templates: {
		emailHost: `emailhost.html`,
		emailParticipant: `emailparticipant.html`,
		textHost: `texthost.txt`,
		textParticipant: `textparticipant.txt`,
	}
}

module.exports = config;

