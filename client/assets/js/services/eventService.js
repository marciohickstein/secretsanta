angular.module('secretSanta').factory('eventService', ($http) => {
	const pathUrl = 'event';

	const _create = (event) => $http.post(getUrl(pathUrl), event);

	return {
		create: _create,
	};
});
