"use strict"

require('dotenv').config({ quiet: true });

const PORT_DEFAULT = 3333;

const config = {
	app: {
		port: process.env.PORT || PORT_DEFAULT,
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

