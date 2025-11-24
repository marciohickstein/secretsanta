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
		emailEventCreated: `<center><h4>Evento de amigo secreto gerado com sucesso.</h4>
		<p><b>OBS: Foi enviado um email para cada participante com seu respectivo amigo secreto! :)</b></p>
		</center>`
		,
		emailEventAlreadyCreated: `<center><h4>Evento de amigo secreto j&aacute foi gerado com sucesso em {DATE_EVENT_DRAW}.</h4></center>`
		,
		emailHost: `<p>Ol&aacute; {HOST_NAME}</p>
		<p>Para validar e sortear o seu evento de amigo secreto clique no link: <a href="{URL_TO_SORT}">Sortear Amigo Secreto</a></p>
		<p><b>OBS: Ser&aacute; enviado um email para cada participante com seu respectivo amigo secreto!</b></p>`
		,
		emailParticipant: `<p>Ol&aacute; <b>{NAME_FRIEND}</b></p>
		<p>Voc&ecirc; est&aacute participando da lista do amigo secreto gerado pelo sistema <b>Secret Santa</b> e seu amigo secreto &eacute; o <b>{NAME_RECEIVER}</b>!</p>
		<p>Abaixo segue mensagem deixada pelo organizador do evento <b>{NAME_HOST}</b>:</p>
		<i>{TEXT}</i>
		<p>Lista de compras: <a href="{URL_SHOW_WISHLIST}">Ver</a> &nbsp; <a href="{URL_ADD_WISHLIST}">Adicionar</a></p>
		<p><b>Espero que curtam ;) !!!</b></p>`,
		textEventCreated:
			`Evento de amigo secreto gerado com sucesso.
OBS: Foi enviado um email para cada participante com seu respectivo amigo secreto! :)`,

		textEventAlreadyCreated:
			`Evento de amigo secreto já foi gerado com sucesso em {DATE_EVENT_DRAW}.`,

		textHost:
			`Ola {HOST_NAME}

Para validar e sortear o seu evento de amigo secreto clique no link abaixo:
{URL_TO_SORT}

OBS: Sera enviado um email para cada participante com seu respectivo amigo secreto!`,

		textParticipant:
			`Ola {NAME_FRIEND}

Você esta participando da lista do amigo secreto gerado pelo sistema Secret Santa 
e seu amigo secreto é o {NAME_RECEIVER}!

Abaixo segue a mensagem deixada pelo organizador do evento {NAME_HOST}:
{TEXT}

Lista de compras:
Ver: {URL_SHOW_WISHLIST}
Adicionar: {URL_ADD_WISHLIST}

Espero que curtam ;) !!!`
	}
}

module.exports = config;

