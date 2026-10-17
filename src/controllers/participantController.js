"use strict"

require('module-alias/register');

const ParticipantModel = require('@models/participantModel');
const EventModel = require('@models/eventModel');
const suggestionService = require('@services/suggestionService');

const participantController = {};

/* Retorna apenas o nome: e-mail, celular e token de edicao nunca saem da API */
participantController.getOne = async (req, res) => {
	const [participant] = await ParticipantModel.get(req.params.id);

	if (!participant)
		return res.status(404).json({ error: true, message: "Participante não encontrado" });

	return res.status(200).json({ id: participant.id, name: participant.name });
};

/* Ideias de presente com links das lojas parceiras, pelo perfil do participante e valor maximo do evento */
participantController.suggestions = async (req, res) => {
	const [participant] = await ParticipantModel.get(req.params.id);

	if (!participant)
		return res.status(404).json({ error: true, message: "Participante não encontrado" });

	const [event] = participant.eventId ? await EventModel.get(participant.eventId) : [];

	return res.status(200).json(suggestionService.suggest(participant.profile, event && event.amount));
};

module.exports = participantController;
