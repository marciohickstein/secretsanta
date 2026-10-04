
if (!appSecretSanta)
	appSecretSanta = angular.module("secretSanta", []);

var idParticipant = getUrlParameter('idparticipant');
appSecretSanta.value("idParticipant", idParticipant ? idParticipant : '');

	
appSecretSanta.controller("ctrlParticipant", async ($scope, participantService, idParticipant) => {
	$scope.participant = [];
	$scope.idParticipant = idParticipant;

	$scope.getParticipant = () => {
		if (!$scope.idParticipant)
			return;

		participantService.get($scope.idParticipant)
			.then((response) => {
				$scope.participant = response.data || {};
			})
			.catch((error) => console.log(error));
	}
});
