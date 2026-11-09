"use strict"

require('module-alias/register');

const cepService = require('@services/cepService');

const addressController = {};

addressController.getCep = async (req, res) => {
	const cep = String(req.params.cep || '').replace(/\D/g, '');

	if (cep.length !== 8)
		return res.status(400).json({ error: true, message: 'CEP inválido: informe os 8 dígitos.' });

	let address;
	try {
		address = await cepService.lookup(cep);
	} catch {
		return res.status(503).json({ error: true, message: 'Não foi possível consultar o CEP agora. Preencha o endereço manualmente.' });
	}

	if (!address)
		return res.status(404).json({ error: true, message: 'CEP não encontrado. Confira os números ou preencha o endereço manualmente.' });

	return res.status(200).json(address);
};

module.exports = addressController;
