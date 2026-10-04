"use strict"

const config = require('../config');

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]{2,}$/;

class ValidationError extends Error {
	constructor(message) {
		super(message);
		this.name = 'ValidationError';
		this.status = 400;
	}
}

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function text(value, field, { required = false, max = 200 } = {}) {
	if (value === undefined || value === null || value === '') {
		if (required) throw new ValidationError(`Campo obrigatório: ${field}.`);
		return '';
	}

	if (typeof value !== 'string' && typeof value !== 'number') {
		throw new ValidationError(`Campo inválido: ${field}.`);
	}

	const str = String(value).trim();

	if (required && !str) throw new ValidationError(`Campo obrigatório: ${field}.`);
	if (str.length > max) throw new ValidationError(`Campo ${field} excede ${max} caracteres.`);

	return str;
}

function amount(value, field) {
	const num = typeof value === 'string' ? Number(value.replace(',', '.')) : value;

	if (typeof num !== 'number' || !Number.isFinite(num) || num < 0 || num > 1000000) {
		throw new ValidationError(`Campo inválido: ${field}.`);
	}

	return num;
}

function email(value, field) {
	const str = text(value, field, { required: true, max: 254 }).toLowerCase();
	if (!EMAIL.test(str)) throw new ValidationError(`E-mail inválido: ${field}.`);
	return str;
}

function celphone(value, field) {
	const str = text(value, field, { max: 20 });
	if (str && !/^\+?[\d\s().-]{8,20}$/.test(str)) throw new ValidationError(`Celular inválido: ${field}.`);
	return str;
}

function participant(value, field) {
	if (!isPlainObject(value)) throw new ValidationError(`Participante inválido: ${field}.`);

	return {
		name: text(value.name, `${field}.name`, { required: true, max: 100 }),
		email: email(value.email, `${field}.email`),
		celphone: celphone(value.celphone, `${field}.celphone`),
	};
}

/* Valida o corpo de criacao de evento e retorna apenas os campos permitidos */
function validateEvent(body) {
	if (!isPlainObject(body)) throw new ValidationError('Dados do evento inválidos.');

	const host = participant(body.host, 'host');

	if (!Array.isArray(body.participants)) throw new ValidationError('Lista de participantes inválida.');

	const total = body.participants.length + 1;
	const { minParticipants, maxParticipants } = config.limits;

	if (total < minParticipants || total > maxParticipants) {
		throw new ValidationError(`O evento deve ter entre ${minParticipants} e ${maxParticipants} participantes (incluindo o organizador).`);
	}

	const participants = body.participants.map((p, i) => participant(p, `participants[${i}]`));

	const emails = new Set([host.email, ...participants.map(p => p.email)]);
	if (emails.size !== total) throw new ValidationError('Há e-mails repetidos entre os participantes.');

	return {
		event: {
			date: text(body.date, 'date', { max: 50 }),
			location: text(body.location, 'location', { required: true, max: 200 }),
			amount: amount(body.amount, 'amount'),
			message: text(body.message, 'message', { required: true, max: 1000 }),
		},
		host,
		participants,
	};
}

/* Valida a lista de presentes e retorna apenas os campos permitidos */
function validateWishlist(body) {
	if (!isPlainObject(body) || !Array.isArray(body.wishlist)) {
		throw new ValidationError('Lista de presentes inválida.');
	}

	if (body.wishlist.length > config.limits.maxWishlistItems) {
		throw new ValidationError(`A lista pode ter no máximo ${config.limits.maxWishlistItems} itens.`);
	}

	return body.wishlist.map((item, i) => {
		if (!isPlainObject(item)) throw new ValidationError(`Item inválido: wishlist[${i}].`);

		return {
			product: text(item.product, `wishlist[${i}].product`, { required: true, max: 200 }),
			price: text(item.price, `wishlist[${i}].price`, { max: 30 }),
			infoExtra: text(item.infoExtra, `wishlist[${i}].infoExtra`, { max: 500 }),
		};
	});
}

module.exports = { ValidationError, validateEvent, validateWishlist };
