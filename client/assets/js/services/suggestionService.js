angular.module('secretSanta').factory('suggestionService', ($http) => {
	const pathUrl = 'participant';

	// Ideias de presente pelo perfil do participante (crianca, mulher, homem) com links das lojas parceiras
	const _get = (id) => $http.get(`${getUrl(pathUrl)}/${encodeURIComponent(id)}/suggestions`);

	return {
		get: _get
	};
});
