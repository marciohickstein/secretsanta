"use strict"

require('module-alias/register');

const WishListModel = require('@models/wishlistModel');
const ParticipantModel = require('@models/participantModel');
const { validateWishlist } = require('@utils/validation');
const { safeEqual } = require('@utils/security');

const controller = {};

controller.getOne = async (req, res) => {
	const [item] = await WishListModel.get(req.params.id);

	if (!item)
		return res.status(404).json({ error: true, message: "Lista de presentes não encontrada" });

	return res.status(200).json({ id: item.id, wishlist: item.wishlist || [] });
};

/* Cria ou atualiza a lista do participante. Exige o token de edicao enviado somente ao proprio participante */
controller.save = async (req, res) => {
	const id = req.params.id;
	const [participant] = await ParticipantModel.get(id);

	if (!participant || !safeEqual(req.get('X-Edit-Token'), participant.editToken))
		return res.status(403).json({ error: true, message: "Link de edição inválido." });

	const wishlist = validateWishlist(req.body);
	const [exists] = await WishListModel.get(id);

	const saved = exists
		? await WishListModel.update(id, { wishlist })
		: await WishListModel.create({ id, wishlist });

	return res.status(200).json({ id: saved.id, wishlist: saved.wishlist });
};

module.exports = controller;
