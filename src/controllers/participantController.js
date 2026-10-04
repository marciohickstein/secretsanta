"use strict"

require('module-alias/register');

const ParticipantModel = require('@models/participantModel');

const participantController = {};

/* Retorna apenas o nome: e-mail, celular e token de edicao nunca saem da API */
participantController.getOne = async (req, res) => {
	const [participant] = await ParticipantModel.get(req.params.id);

	if (!participant)
		return res.status(404).json({ error: true, message: "Participante não encontrado" });

	return res.status(200).json({ id: participant.id, name: participant.name });
};

module.exports = participantController;
