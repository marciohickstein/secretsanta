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
	},
	templates: {
		emailEventCreated: `emaileventcreated.html`
		,
		emailEventAlreadyCreated: `emaileventalreadycreated.html`
		,
		emailHost: `emailhost.html`
		,
		emailParticipant: `emailparticipant.html`,
		textEventCreated: `texteventcreated.txt`,

		textEventAlreadyCreated: `texteventalreadycreated.txt`,

		textHost: `texthost.txt`,

		textParticipant: `textparticipant.txt`
	}
}

module.exports = config;

