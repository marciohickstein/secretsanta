angular.module('secretSanta').factory('participantService', ($http) => {
	const pathUrl = 'participant';

	const _get = (id) => $http.get(`${getUrl(pathUrl)}/${encodeURIComponent(id)}`);

	return {
		get: _get
	};
});