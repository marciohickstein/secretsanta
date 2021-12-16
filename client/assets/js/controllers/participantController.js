
if (!appSecretSanta)
	appSecretSanta = angular.module("secretSanta", []);

var idParticipant = getUrlParameter('idparticipant');
appSecretSanta.value("idParticipant", idParticipant ? idParticipant : '');

	
appSecretSanta.controller("ctrlParticipant", async ($scope, participantService, idParticipant) => {
	$scope.participant = [];
	$scope.idParticipant = idParticipant;

	$scope.getParticipant = () => {
		participantService.get($scope.idParticipant)
			.then((response) => {
				let data = response.data.length > 0 ? response.data[0] : {};
				$scope.participant = data;
			})
			.catch((error) => console.log(error));
	}
});
