let _TEST_ = getUrlParameter('test');

let app = angular.module('secretSanta', []);

app.controller('ctrlEvent', ($scope, eventService) => {

	if (_TEST_) {
		$scope.date = new Date().toLocaleString();
		// $scope.date = `2021-12-25T21:00`;
		$scope.eventLocal = "Av. Tulio de Rose, 260 - Salao de Festas";
		$scope.eventAmount = 300.00;
		$scope.eventMessage = "Ola pessoal, nosso amigo secreto foi gerado pelo SecretSanta Generator. Por favor sigam as instrucoes e boas festas!";
		$scope.participants = [
			{
				name: "Marcio Hickstein",
				email: "marcio.hickstein@gmail.com"
			},
			{
				name: "Claudio Hickstein",
				email: "hicky_kitten@yahoo.com"
			},
			{
				name: "Leo Hickstein",
				email: "hicky.kt@gmail.com"
			}
		];
	}
	else {
		$scope.participants = [{}, {}, {}];
	}

	$scope.addParticipant = () => {
		$scope.participants.push({});
	}

	$scope.delParticipant = (participant) => {
		const idxToDel = $scope.participants.indexOf(participant);
		$scope.participants.splice(idxToDel, 1);
	}

	$scope.createEvent = async () => {
		const restParticipants = $scope.participants.slice(1);
		const url = getUrl(`event`);
		const event = {
			date: new Date().toLocaleString(),
			location: $scope.eventLocal,
			amount: $scope.eventAmount,
			host: $scope.participants[0],
			message: $scope.eventMessage,
			participants: restParticipants,
			url
		}
		const result = await eventService.create(event);

		// console.log(result);
	}
});

