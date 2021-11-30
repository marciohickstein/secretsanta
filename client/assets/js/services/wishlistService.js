let id = getUrlParameter('id');

angular.module('wishlist').factory('wishlistService', ($http) => {
	let api = 'wishlist';

	const _getWishList = (id) => $http.get(`${getUrl(api)}/${id}`);

	return {
		getWishList: _getWishList
	};
});

