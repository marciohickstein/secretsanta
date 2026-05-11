"use strict"

require('dotenv').config({ quiet: true });

const PORT_DEFAULT = 3333;

const config = {
	app: {
		port: process.env.PORT || PORT_DEFAULT,
	},
	notifications: {
		email:    process.env.NOTIFY_EMAIL    !== 'false',
		whatsapp: process.env.NOTIFY_WHATSAPP === 'true',
		sms:      process.env.NOTIFY_SMS      === 'true',
	},
	twilio: {
		sid: process.env.TWILIO_SID,
		token: process.env.TWILIO_TOKEN,
		from: process.env.TWILIO_FROM,
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

