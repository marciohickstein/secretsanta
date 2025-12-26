"use strict"

require('dotenv').config({ quiet: true });

const PORT_DEFAULT = 3333;

const config = {
	app: {
		port: process.env.PORT || PORT_DEFAULT,
	},
	twilio: {
		sid: process.env.TWILIO_SID,
		token: process.env.TWILIO_TOKEN,
		from: process.env.TWILIO_FROM,
	},
	email: {
		service: process.env.MAIL_SERVICE,
		host: process.env.MAIL_HOST,
		port: process.env.MAIL_PORT,
		from: process.env.MAIL_FROM,
		user: process.env.MAIL_USER,
		pass: process.env.MAIL_PASS,
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

