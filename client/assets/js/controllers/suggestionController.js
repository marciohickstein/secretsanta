if (!appSecretSanta)
	appSecretSanta = angular.module("secretSanta", []);

appSecretSanta.controller("ctrlSuggestions", ($scope, suggestionService, idParticipant) => {
	const PROFILE_LABELS = { crianca: 'criança', mulher: 'mulher', homem: 'homem' };

	$scope.suggestions = [];
	$scope.profileLabel = '';
	$scope.maxAmount = null;

	$scope.getSuggestions = () => {
		if (!idParticipant)
			return;

		suggestionService.get(idParticipant)
			.then((response) => {
				const data = response.data || {};
				$scope.suggestions = data.items || [];
				$scope.profileLabel = PROFILE_LABELS[data.profile] || '';
				$scope.maxAmount = data.maxAmount;
			})
			.catch((error) => console.log(error));
	}
});
