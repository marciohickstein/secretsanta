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

function Controller() {
	this.name = model;
	this.getAll = async function (req, res) {
		const items = await model.get();
		return res.json(items);
	};
	this.getOne = async function (req, res) {
		const responseError = { error: true, message: "Registro não encontrado" };

		if (!req.params.id)
			return res.status(404).json(responseError);

		const id = req.params.id ? req.params.id : '';
		const item = await this._model.get(id);

		if (!Array.isArray(item) || item.length <= 0)
			return res.status(404).json(responseError);
	
		return res.status(200).json(item);
	};
	this.create = async function(req, res) {
		const item = req.body;
		const itemCreated = await this._model.create(item);
		return res.status(200).json(itemCreated);
	};
	this.delete = async function(req, res) {
		const id = req.params.id;
		const responseError = { error: true, message: "Registro não encontrado" };

		if (!id)
			return res.status(404).json(responseError);

		try {
			const itemDeleted = await this._model.delete(id);
			return res.status(200).json(itemDeleted);
		} catch (error) {
			return res.status(404).json(responseError);
		}
	}	
}


const replaceTags = (text, tags) => {
	let textReplaced = text;

	for (const tag of tags) {
		textReplaced = textReplaced.replaceAll(tag[0], tag[1]);
	}

	return textReplaced;
}

const getRootPath = () => {
	return process.env.PWD;
}

const resolvePath = (pathToResolve) => {
	return path.resolve(pathToResolve);
}

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
		// console.log(info);
	})

}

function sendEmails(listFriendsSorted, hostName, subject, text) {

	listFriendsSorted.forEach(secret => {
		let tags = [
			['{NAME_FRIEND}', secret.friend.name ],
			['{NAME_RECEIVER}', secret.receiver.name ],
			['{NAME_HOST}', hostName ],
			['{TEXT}', text ],
		];

		const textMessage = replaceTags(config.templates.emailParticipant, tags);

		sendEmail(config.email.from, secret.friend.email, subject, textMessage);
	});

	return ({ error: 0, message: 'Emails enviados para todos os participantes com sucesso!', friends: listFriendsSorted });
}

module.exports = { shuffleArray, createListFriends, drawParticipants, sendEmail, sendEmails, getRootPath, resolvePath, replaceTags };