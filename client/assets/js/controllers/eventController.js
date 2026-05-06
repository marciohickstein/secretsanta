
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
				email: "marcio.hickstein@gmail.com",
				celphone: "51984120669"
			},
			{
				name: "Ana Paula Fernandes",
				email: "marcio.inetsoft@gmail.com",
				celphone: "51984120669"
			},
			{
				name: "Leo Hickstein",
				email: "hicky.kt@gmail.com",
				celphone: "51984120669"
			}
		];
	}
	else {
		$scope.participants = [{}, {}, {}];
	}

	$scope.validInput = function () {
		let message = "";

		// Valida campos do evento
		if (
			!$scope.eventLocal ||
			!$scope.eventAmount ||
			!$scope.eventMessage
		) {
			message = "❌ Dados do evento incompletos.";
			console.error(message);
			return message;
		}

		// Valida participantes
		if (!$scope.participants || $scope.participants.length < 2) {
			message = "❌ É necessário pelo menos 2 participantes.";
			console.error(message);
			return message;
		}

		// Verifica se todos os participantes têm os dados obrigatórios
		for (const p of $scope.participants) {
			if (!p.name || !p.email || !p.celphone) {
				message = `❌ Participante com dados faltando: ${JSON.stringify(p)}`;
				console.error(message);
				return message;
			}
		}

		console.log("✅ Dados válidos!");
		return message;
	};

	$scope.addParticipant = () => {
		$scope.participants.push({});
	}

	$scope.delParticipant = (participant) => {
		const idxToDel = $scope.participants.indexOf(participant);
		$scope.participants.splice(idxToDel, 1);
	}

	$scope.createEvent = async () => {
		const errorMessage = $scope.validInput();

		if (errorMessage) {
			alert(errorMessage);
			return;
		}

		const restParticipants = $scope.participants.slice(1);

		const event = {
			date: $scope.eventDate ? new Date($scope.eventDate).toLocaleString() : new Date().toLocaleString(),
			location: $scope.eventLocal,
			amount: $scope.eventAmount,
			host: $scope.participants[0],
			message: $scope.eventMessage,
			participants: restParticipants
		}

		try {
			const response = await eventService.create(event);
			const data = response.data;
			console.log('Evento criado:', data);

			const text = `Parabéns você acabou de criar o seu evento de Amigo Secreto!\nPara enviar os e-mails aos participantes é necessário clicar no link "Sortear Amigo Secreto" enviado para o seu e-mail: ${$scope.participants[0].email}`;
			alert(text);
			window.location.reload();
		} catch (err) {
			const serverMsg = err.data && err.data.message ? err.data.message : 'Erro desconhecido';
			const status = err.status || '?';
			console.error(`Erro ao criar evento [${status}]:`, err.data || err);
			alert(`❌ Falha ao criar o evento (${status}): ${serverMsg}`);
		}
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

