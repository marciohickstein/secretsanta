"use strict"

const config = require('../config');

const nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
const path = require('path');

const transporter = nodemailer.createTransport(smtpTransport({
	service: config.email.service,
	host: config.email.host,
	port: config.email.port,
	tls: {
		rejectUnauthorized: false
	},
	auth: {
		user: config.email.user,
		pass: config.email.pass
	}
}));

const replaceTags = (text, tags) => {
	let textReplaced = text;

	for (const tag of tags) {
		textReplaced = textReplaced.replace(`/${tag[0]}/gi`, tag[1]);
	}

	return textReplaced;
}
/**
 * Given a path, return the root path of the project
 * @returns A string.
 */

const getRootPath = () => {
	return process.env.PWD;
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

function sendEmail(from, to, subject, text) {

	let mailOptions = {
		from,
		to,
		subject,
		html: text
	}

	transporter.sendMail(mailOptions, (err, info) => {
		if (err){
			return ({ error: 1, massage: `Ocorreu um no envio do email para : ${to}. Detalhes: ${err}` });
		}
		console.log(info);
	})

}


const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

// const getFullUrl = (req, restUrl) => {
// 	let baseUrl = getBaseUrl(req);
// 	return !restUrl ? baseUrl : `${baseUrl}/${restUrl}`;
// }

function sendEmails(listFriendsSorted, hostName, subject, text) {

	listFriendsSorted.forEach(secret => {
		let tags = [
			['{NAME_FRIEND}', secret.friend.name ],
			['{NAME_RECEIVER}', secret.receiver.name ],
			['{NAME_HOST}', hostName ],
			['{TEXT}', text ],
			['{URL_SHOW_WISHLIST}', secret.receiver.urlShowWishList ],
			['{URL_ADD_WISHLIST}', secret.friend.urlAddWishList ],
		];

		const textMessage = replaceTags(config.templates.emailParticipant, tags);

		sendEmail(config.email.from, secret.friend.email, subject, textMessage);
	});

	return ({ error: 0, message: 'Emails enviados para todos os participantes com sucesso!', friends: listFriendsSorted });
}

module.exports = { shuffleArray, createListFriends, drawParticipants, sendEmail, sendEmails, getRootPath, resolvePath, replaceTags, getBaseUrl };