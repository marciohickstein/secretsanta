"use strict"

require('module-alias/register');
const BasicController = require('@controllers/basicController');
const WishListModel = require('@models/wishlistModel');
const ParticipantModel = require('@models/participantModel');

const controller = new BasicController(WishListModel);

controller.create = async function(req, res) {
	const item = req.body;

	// Verifica se jah existe registro
	const itemExists = await WishListModel.get(item.id);

	if (itemExists && itemExists.length >= 1) {
		return res.status(404).json({ error: true, message: "Lista de presentes já existe" });
	}	

	// Verifica se existe este participante
	const participant = await ParticipantModel.get(item.id);

	if (participant.length <= 0) {
		return res.status(404).json({ error: true, message: "Participante não encontrado" });
	}

	const itemCreated = await WishListModel.create(item);
	return res.status(200).json(itemCreated);
};

// controller.delete = async function(req, res) {
// 	const id = req.params.id;
// 	const item2Remove = req.body;
// 	const responseError = { error: true, message: "Registro não encontrado" };

// 	if (!id)
// 		return res.status(404).json(responseError);

// 	try {
// 		const itemDeleted = await model.delete(id);
// 		return res.status(200).json(itemDeleted);
// 	} catch (error) {
// 		return res.status(404).json(responseError);
// 	}
// };



module.exports = controller;
