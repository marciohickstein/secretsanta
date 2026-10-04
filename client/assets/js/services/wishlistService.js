angular.module('secretSanta').factory('wishlistService', ($http) => {
	const api = 'wishlist';

	const _getWishList = (id) => $http.get(`${getUrl(api)}/${encodeURIComponent(id)}`);

	// Cria ou atualiza a lista; o token de edicao chega apenas no link enviado ao proprio participante
	const _saveWishList = (id, token, wishlist) => {
		const url = `${getUrl(api)}/${encodeURIComponent(id)}`;
		return $http.put(url, { wishlist }, { headers: { 'X-Edit-Token': token || '' } });
	};

	return {
		getWishList: _getWishList,
		saveWishList: _saveWishList,
	};
});
