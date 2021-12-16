angular.module('secretSanta').factory('eventService', ($http) => {
	const pathUrl = 'event';

	const _create = (event) => $http.post(getUrl(pathUrl), event);
	const _get = (id = null) => {
		const url = id ? `${getUrl(pathUrl)}/${id}` : getUrl(pathUrl);

		return $http.get(url);
	};

	return {
		create: _create,
		get: _get
	};
});
