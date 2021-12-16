
let _TEST_ = getUrlParameter('test');

if (!appSecretSanta) {
	appSecretSanta = angular.module("secretSanta", []);
}

const idEvent = getUrlParameter('idevent');
appSecretSanta.value("idEvent", idEvent ? idEvent : '');

appSecretSanta.controller('ctrlEvent', ($scope, eventService, idEvent) => {
	$scope.events = [];
	$scope.idEvent = idEvent;

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

		const event = {
			date: new Date().toLocaleString(),
			location: $scope.eventLocal,
			amount: $scope.eventAmount,
			host: $scope.participants[0],
			message: $scope.eventMessage,
			participants: restParticipants
		}
		const { data } = await eventService.create(event);

		const text = `Parabéns você acabou de criar o seu evento de Amigo Secreto!
Para enviar os emails para os participantes com seus respectivos amigos secreto é necessário clicar no link "Sortear Amigo Secreto" enviado para o seu email: ${$scope.participants[0].email} .`;
		alert(text);
		console.log(data);
		window.location.reload();
	}

	$scope.getEvents = () => {
		eventService.get()
			.then((response) => { 
				$scope.events = response.data;
			})
			.catch((error) => console.log(error));
	}

	$scope.getEvent = () => {
		eventService.get($scope.idEvent)
			.then((response) => { 
				$scope.event = response.data;
			})
			.catch((error) => console.log(error));
	}
});

