
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
		$scope.eventDate = new Date(2021, 11, 25, 21, 0);
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

	$scope.saving = false;
	$scope.modal = {};

	// Exibe a caixa de mensagem (sucesso ou erro) no lugar do alert()
	const showMessage = (options, onClose) => {
		const element = document.getElementById('messageModal');

		$scope.$applyAsync(() => {
			$scope.modal = {
				type: 'error',
				icon: 'bi-exclamation-triangle-fill',
				button: 'Entendi',
				...options
			};
		});

		if (onClose) {
			element.addEventListener('hidden.bs.modal', () => $scope.$apply(onClose), { once: true });
		}

		bootstrap.Modal.getOrCreateInstance(element).show();
	};

	const resetForm = () => {
		$scope.eventDate = null;
		$scope.eventLocal = '';
		$scope.eventAmount = null;
		$scope.eventMessage = '';
		$scope.participants = [{}, {}, {}];
	};

	$scope.validInput = function () {
		// Valida campos do evento
		if (!$scope.eventLocal || !$scope.eventAmount || !$scope.eventMessage) {
			return "Preencha o local da festa, o valor máximo do presente e a mensagem para os convidados.";
		}

		// Valida participantes
		if (!$scope.participants || $scope.participants.length < 3) {
			return "O amigo secreto precisa de pelo menos 3 participantes, incluindo você.";
		}

		// Verifica se todos os participantes têm os dados obrigatórios
		for (const [index, p] of $scope.participants.entries()) {
			if (!p.name || !p.email || !p.celphone) {
				const who = index === 0 ? 'do organizador (participante 1)' : `do participante ${index + 1}`;
				return `Preencha nome, e-mail válido e celular ${who}.`;
			}
		}

		return "";
	};

	$scope.addParticipant = () => {
		$scope.participants.push({});
	}

	$scope.delParticipant = (participant) => {
		const idxToDel = $scope.participants.indexOf(participant);
		$scope.participants.splice(idxToDel, 1);
	}

	$scope.createEvent = async () => {
		if ($scope.saving)
			return;

		const errorMessage = $scope.validInput();

		if (errorMessage) {
			showMessage({ title: 'Quase lá!', message: errorMessage });
			return;
		}

		const restParticipants = $scope.participants.slice(1);
		const hostEmail = $scope.participants[0].email;

		const event = {
			date: $scope.eventDate ? new Date($scope.eventDate).toLocaleString() : new Date().toLocaleString(),
			location: $scope.eventLocal,
			amount: $scope.eventAmount,
			host: $scope.participants[0],
			message: $scope.eventMessage,
			participants: restParticipants
		}

		$scope.saving = true;

		try {
			const response = await eventService.create(event);

			showMessage({
				type: 'success',
				icon: 'bi-check-lg',
				title: 'Evento criado com sucesso! 🎉',
				message: 'Agora é só fazer o sorteio pelo painel do organizador.',
				email: hostEmail,
				link: response.data && response.data.organizerUrl,
				button: 'Fechar'
			}, resetForm);
		} catch (err) {
			const serverMsg = err.data && err.data.message ? err.data.message : 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
			console.error(`Erro ao criar evento [${err.status || '?'}]:`, err.data || err);

			showMessage({
				title: err.status === 429 ? 'Muitas tentativas' : 'Não foi possível criar o evento',
				message: serverMsg
			});
		} finally {
			$scope.$applyAsync(() => { $scope.saving = false; });
		}
	}

	$scope.getEvent = () => {
		if (!$scope.idEvent)
			return;

		eventService.get($scope.idEvent)
			.then((response) => {
				$scope.event = response.data;
			})
			.catch((error) => console.log(error));
	}
});

