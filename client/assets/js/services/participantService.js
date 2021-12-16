angular.module('secretSanta').factory('participantService', ($http) => {
	const pathUrl = 'participant';

	const _get = (id = null) => {
		const url = id ? `${getUrl(pathUrl)}/${id}` : getUrl(pathUrl);

		return $http.get(url);
	};

	return {
		get: _get
	};
});