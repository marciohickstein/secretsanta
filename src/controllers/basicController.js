"use strict"

require('module-alias/register');

const config = require('@config');

function BasicController(model) {
	this.getAll = async function(req, res) {
		const items = await model.get();
		return res.json(items);
	};

	this.getOne = async function(req, res) {
		const responseError = { error: true, message: "Registro não encontrado" };

		if (!req.params.id)
			return res.status(404).json(responseError);

		const id = req.params.id ? req.params.id : '';
		const item = await model.get(id);

		if (!Array.isArray(item) || item.length <= 0)
			return res.status(404).json(responseError);
	
		return res.status(200).json(item);
	};

/* It's a function that will be called when the user will try to create a new item. */
	this.create = async function(req, res) {
		const item = req.body;

		const itemExists = await model.get(item.id);

		if (Array.isArray(itemExists) && itemExists.length >= 1)
			return res.status(404).json( { error: true, message: "ID já está sendo usado por um registro" });

			const itemCreated = await model.create(item);
		return res.status(200).json(itemCreated);
	};

/* It's a function that will be called when the user will try to delete an item. */
	this.delete = async function(req, res) {
		const id = req.params.id;
		const responseError = { error: true, message: "Registro não encontrado" };

		if (!id)
			return res.status(404).json(responseError);

		try {
			const itemDeleted = await model.delete(id);
			return res.status(200).json(itemDeleted);
		} catch (error) {
			return res.status(404).json(responseError);
		}
	};
}

module.exports = BasicController;