
if (!appSecretSanta)
	appSecretSanta = angular.module("secretSanta", []);

var idParticipant = getUrlParameter('idparticipant');
appSecretSanta.value("idParticipant", idParticipant ? idParticipant : '');
appSecretSanta.value("editToken", getUrlParameter('token') || '');

appSecretSanta.controller("ctrlWishList", ($scope, wishlistService, idParticipant, editToken) => {
	$scope.save = false;
	$scope.wishlist = [];
	$scope.wishlistTemp = [];
	$scope.canEdit = Boolean(idParticipant && editToken);

	$scope.changeDataField = () => {
		$scope.save = true;
	}

	$scope.getWishList = () => {
		if (!idParticipant)
			return;

		wishlistService.getWishList(idParticipant)
			.then((response) => {
				$scope.wishlist = (response.data && response.data.wishlist) || [];
				$scope.getItems();
			})
			.catch((error) => {
				if (error.status !== 404)
					console.log(error);
				$scope.wishlist = [];
				$scope.getItems();
			});
	}

	$scope.saveWishList = (wishlist) => {
		if (!$scope.canEdit) {
			alert('❌ Link de edição inválido. Use o link "Adicionar presentes" recebido por e-mail.');
			return;
		}

		const items = wishlist.map(({ product, price, infoExtra }) => ({ product, price, infoExtra }));

		wishlistService.saveWishList(idParticipant, editToken, items)
			.then(() => {
				$scope.getWishList();
				$scope.save = false;
			})
			.catch((error) => {
				const serverMsg = error.data && error.data.message ? error.data.message : 'Erro desconhecido';
				console.log(error);
				alert(`❌ Falha ao salvar a lista: ${serverMsg}`);
			});
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
