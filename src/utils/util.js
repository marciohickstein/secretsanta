"use strict"

const whatsapp = require('./whatsAppSender');
const config = require('../config');
const Template = require('./template');

const { randomInt } = require('crypto');

/*
 * Retorna uma copia embaralhada do array (Fisher-Yates), com todas as ordens igualmente provaveis.
 * sort(() => Math.random() - 0.5) nao serve: o resultado e enviesado e depende do motor JS.
 */
const shuffleArray = function (array) {
	if (!Array.isArray(array))
		return [];

	const arrayShuffled = [...array];

	for (let i = arrayShuffled.length - 1; i > 0; i--) {
		const j = randomInt(i + 1);
		[arrayShuffled[i], arrayShuffled[j]] = [arrayShuffled[j], arrayShuffled[i]];
	}

	return arrayShuffled;
}

const createListFriends = function (participants) {
	const listFriends = participants.reduce((list, friend, index, friends) => {
		if (index === friends.length - 1) {
			list.push({
				friend, 
				receiver: friends[0]
			});
		}
		else {
			list.push({
				friend, 
				receiver: friends[index + 1]
			});
		}
		
		return list;
	}, []);
	return listFriends;
}

const drawParticipants = function (listParticipants) {
	const listFriends = createListFriends(shuffleArray(listParticipants));
	return listFriends;
}

const logger = require('./logger');

let warnedBaseUrl = false;

/* URL publica da aplicacao. Usa APP_URL para nao confiar no cabecalho Host enviado pelo cliente */
const getBaseUrl = (req) => {
	if (config.app.url) return config.app.url;

	if (!warnedBaseUrl) {
		logger.warn('APP_URL não configurada: os links usarão o cabeçalho Host da requisição');
		warnedBaseUrl = true;
	}

	return `${req.protocol}://${req.get('host')}`;
};

/* Monta a mensagem do sorteio para um par (friend tira receiver) */
function buildParticipantMessage(templateName, secret, hostName, text) {
	const template = new Template(templateName);

	template.assign('NAME_FRIEND', secret.friend.name);
	template.assign('NAME_RECEIVER', secret.receiver.name);
	template.assign('NAME_HOST', hostName);
	template.assign('TEXT', text);
	template.assign('URL_SHOW_WISHLIST', secret.receiver.urlShowWishList);
	template.assign('URL_ADD_WISHLIST', secret.friend.urlAddWishList);

	return template.replace();
}

/* WhatsApp (e-mail e SMS tem envio rastreado em services/notificationService e smsNotificationService) */
function sendTextMessages(listFriendsSorted, hostName, subject, text) {
	listFriendsSorted.forEach(secret => {
		whatsapp.send(secret.friend.celphone, subject, buildParticipantMessage(config.templates.textParticipant, secret, hostName, text));
	});
}

module.exports = { shuffleArray, createListFriends, drawParticipants, getBaseUrl, buildParticipantMessage, sendTextMessages };
