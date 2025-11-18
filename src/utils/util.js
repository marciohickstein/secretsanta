"use strict"

const email = require('./emailSender');
const whatsapp = require('./whatsAppSender');
const config = require('../config');
const Template = require('./template');

const path = require('path');

/**
 * Given a path, return the root path of the project
 * @returns A string.
 */

const getRootPath = () => {
	return process.cwd();
}

/**
 * Given a path, return the absolute path
 * @param pathToResolve - The path to resolve.
 * @returns A promise.
 */
const resolvePath = (pathToResolve) => {
	return path.resolve(pathToResolve);
}

/* It's a function that receives an array and returns a new array with the same elements but in a
different order. */
const shuffleArray = function (array) {
	if (!Array.isArray(array))
		return [];

	const arrayShuffled = [...array];

	arrayShuffled.sort((a, b) => Math.random() - 0.5);

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

const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

function sendNotification(type, listFriendsSorted, hostName, subject, text) {

	const template = new Template(config.templates.emailParticipant);

	listFriendsSorted.forEach(secret => {
		template.assign('NAME_FRIEND', secret.friend.name);
		template.assign('NAME_RECEIVER', secret.receiver.name);
		template.assign('NAME_HOST', hostName);
		template.assign('TEXT', text);
		template.assign('URL_SHOW_WISHLIST', secret.receiver.urlShowWishList);
		template.assign('URL_ADD_WISHLIST', secret.friend.urlAddWishList);

		const textMessage = template.replace();

		if (type === 'email') {
			email.send(secret.friend.email, subject, textMessage);
		} else {
			whatsapp.send(secret.friend.celphone, subject, textMessage);
		}
	});

	const message = `Mensagens enviadas para todos os participantes com sucesso!`;
	return ({ error: 0, message, friends: listFriendsSorted });
}

function sendEmails(listFriendsSorted, hostName, subject, text) {
	return sendNotification('email', listFriendsSorted, hostName, subject, text);
}

function sendTextMessages(listFriendsSorted, hostName, subject, text) {
	return sendNotification('whatsapp', listFriendsSorted, hostName, subject, text);
}

module.exports = { shuffleArray, createListFriends, drawParticipants, sendEmails, getRootPath, resolvePath, getBaseUrl, sendTextMessages };