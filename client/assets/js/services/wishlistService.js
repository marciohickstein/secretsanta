angular.module('secretSanta').factory('wishlistService', ($http) => {
	let api = 'wishlist';

	const _getWishList = (id) => id ? $http.get(`${getUrl(api)}/${id}`) : $http.get(`${getUrl(api)}`);

	const _saveWishList = (id, wishlist) => {
		const url = `${getUrl(api)}/${id}`;
		return $http.put(url, wishlist);
	};

	const _createWishList = (wishlist) => {
		const url = `${getUrl(api)}`;
		return $http.post(url, wishlist);
	};

	return {
		getWishList: _getWishList,
		saveWishList: _saveWishList,
		createWishList: _createWishList,
	};
});

