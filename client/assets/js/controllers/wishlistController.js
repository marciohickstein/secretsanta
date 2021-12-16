
if (!appSecretSanta)
	appSecretSanta = angular.module("secretSanta", []);

var idParticipant = getUrlParameter('idparticipant');
appSecretSanta.value("idParticipant", idParticipant ? idParticipant : '');

appSecretSanta.controller("ctrlWishList", async ($scope, wishlistService, idParticipant) => {
	$scope.save = false;
	$scope.wishlist = [];
	$scope.wishlistTemp = [];
	$scope.hasWishlist = false;

	$scope.changeDataField = () => {
		$scope.save = true;
	}
	
	$scope.getWishList = () => {
		wishlistService.getWishList(idParticipant ? idParticipant : null)
			.then((response) => {
				let wishlist = response.data.length > 0 ? response.data[0].wishlist : {};
				$scope.wishlist = wishlist;
				$scope.getItems();
				$scope.hasWishlist = true;
			})
			.catch((error) => {
				console.log(error)
				$scope.hasWishlist = false;
			});
	}

	$scope.saveWishList = (wishlist) => {
		if (!idParticipant)
			return ;

		const wishlistItem = {
			id: idParticipant,
			wishlist
		}

		if ($scope.hasWishlist) {
			wishlistService.saveWishList(idParticipant, wishlistItem)
				.then((response) => {
					// let wishlist = response.data.length > 0 ? response.data[0].wishlist : {};
					// $scope.wishlist = wishlist;
					$scope.getWishList();
					$scope.save = false;
				})
				.catch((error) => { 
					console.log(error)
				});
		}
		else {
			wishlistService.createWishList(wishlistItem)
				.then((response) => {
					// let wishlist = response.data.length > 0 ? response.data[0].wishlist : {};
					// $scope.wishlist = wishlist;
					$scope.getWishList();
					$scope.save = false;
				})
				.catch((error) => { 
					console.log(error)
				});
		}
	}

	$scope.addItem = () => {
		const gift = {
			product: "Presente",
			price: 100,
			infoExtra: "Local, cor, marcar, etc."
		}
		$scope.wishlistTemp.push(gift);
		$scope.save = true;
	}

	$scope.delItem = (item) => {
		const idxToDel = $scope.wishlistTemp.indexOf(item);
		$scope.wishlistTemp.splice(idxToDel, 1);
		$scope.save = true;
	}

	$scope.getItems = () => {
		$scope.wishlistTemp = [...$scope.wishlist];
	}
});
