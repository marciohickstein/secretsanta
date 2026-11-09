angular.module('secretSanta').factory('addressService', ($http) => {
	const pathUrl = 'address';

	// Endereco de um CEP (8 digitos): { cep, street, district, city, state }
	const _lookupCep = (cep) => $http.get(`${getUrl(pathUrl)}/cep/${encodeURIComponent(cep)}`);

	return {
		lookupCep: _lookupCep
	};
});
