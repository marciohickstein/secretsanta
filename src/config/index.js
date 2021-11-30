"use strict"

require('dotenv').config();

const PORT_DEFAULT = 3333;

module.exports = {
	app: {
		port: process.env.PORT || PORT_DEFAULT,
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
		<p>Para validar e sortear o seu amigo secreto clique no link: <a href="{URL_TO_SORT}">Sortear Amigo Secreto</a></p>
		<p><b>OBS: Ser&aacute; enviado um email para cada participante com seu respectivo amigo secreto!</b></p>`
		,
		emailParticipant: `<p>Ol&aacute; <b>{NAME_FRIEND}</b></p>
		<p>Voc&ecirc; est&aacute participando da lista do amigo secreto organizado pelo <b>Secret Santa Generator</b> e seu amigo secreto &eacute; o <b>{NAME_RECEIVER}</b>!</p>
		<p>Abaixo segue mensagem deixada pelo organizador do evento <b>{NAME_HOST}</b>:</p>
		<i>{TEXT}</i>
		
		<p><b>Espero que curtam ;) !!!</b></p>`
	}
}
