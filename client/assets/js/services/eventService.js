angular.module('secretSanta').factory('eventService', ($http) => {
	const pathUrl = 'event';

	const _create = (event) => $http.post(getUrl(pathUrl), event);
	const _get = (id) => $http.get(`${getUrl(pathUrl)}/${encodeURIComponent(id)}`);

	return {
		create: _create,
		get: _get
	};
});
