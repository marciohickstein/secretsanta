angular.module('secretSanta').factory('panelService', ($http) => {
	const base = (eventId) => `${getUrl('event')}/${encodeURIComponent(eventId)}/organizer`;
	const options = (token) => ({ headers: { 'X-Admin-Token': token || '' } });

	return {
		get: (eventId, token) => $http.get(base(eventId), options(token)),
		draw: (eventId, token) => $http.post(`${base(eventId)}/draw`, {}, options(token)),
		resend: (eventId, token, participantId) =>
			$http.post(`${base(eventId)}/participants/${encodeURIComponent(participantId)}/resend`, {}, options(token)),
		updateParticipant: (eventId, token, participantId, data) =>
			$http.patch(`${base(eventId)}/participants/${encodeURIComponent(participantId)}`, data, options(token)),
	};
});
