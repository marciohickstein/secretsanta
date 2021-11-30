let app = angular.module("wishlist", []);
	
app.controller("ctrlWishList", async ($scope, $http, wishlistService) => {

	$scope.teste
	$scope.wishlist = [];

	$scope.getData = () => {
		wishlistService.getWishList(id)
		.then((response) => { 
			let wishlist = response.data[0].wishlist;
			$scope.wishlist = wishlist;
		})
		.catch((error) => console.log(error));

		// $scope.teste = data[0].name;
	}

	$scope.getData();
});
