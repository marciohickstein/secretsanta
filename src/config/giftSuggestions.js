"use strict"

/*
 * Catalogo de ideias de presente por perfil do participante.
 * - query: termo pesquisado nas lojas parceiras
 * - from:  preco aproximado de entrada (R$), usado para filtrar pelo valor maximo do evento
 * - icon:  icone do Bootstrap Icons
 * O perfil 'geral' e usado quando o organizador nao informou o perfil.
 */
module.exports = {
	crianca: [
		{ title: 'Blocos de montar', query: 'blocos de montar infantil', from: 50, icon: 'bi-bricks' },
		{ title: 'Boneca', query: 'boneca infantil', from: 50, icon: 'bi-emoji-smile' },
		{ title: 'Carrinho de controle remoto', query: 'carrinho controle remoto infantil', from: 90, icon: 'bi-controller' },
		{ title: 'Quebra-cabeça infantil', query: 'quebra cabeça infantil', from: 30, icon: 'bi-puzzle' },
		{ title: 'Jogo de tabuleiro infantil', query: 'jogo de tabuleiro infantil', from: 50, icon: 'bi-dice-5' },
		{ title: 'Kit de pintura e desenho', query: 'kit pintura desenho infantil', from: 40, icon: 'bi-palette' },
		{ title: 'Livro infantil', query: 'livro infantil', from: 25, icon: 'bi-book' },
		{ title: 'Pelúcia', query: 'pelucia', from: 40, icon: 'bi-heart' },
		{ title: 'Massinha de modelar', query: 'kit massinha de modelar', from: 25, icon: 'bi-hand-index-thumb' },
		{ title: 'Bola de futebol', query: 'bola de futebol infantil', from: 50, icon: 'bi-dribbble' },
		{ title: 'Fantasia infantil', query: 'fantasia infantil', from: 60, icon: 'bi-stars' },
		{ title: 'Patinete', query: 'patinete infantil', from: 150, icon: 'bi-bicycle' },
	],
	mulher: [
		{ title: 'Kit de skincare', query: 'kit skincare feminino', from: 60, icon: 'bi-droplet' },
		{ title: 'Perfume feminino', query: 'perfume feminino', from: 100, icon: 'bi-flower1' },
		{ title: 'Bolsa', query: 'bolsa feminina', from: 90, icon: 'bi-handbag' },
		{ title: 'Necessaire', query: 'necessaire feminina', from: 35, icon: 'bi-bag' },
		{ title: 'Kit de maquiagem', query: 'kit maquiagem', from: 60, icon: 'bi-brush' },
		{ title: 'Pijama feminino', query: 'pijama feminino', from: 60, icon: 'bi-moon-stars' },
		{ title: 'Vela aromática', query: 'vela aromatica', from: 35, icon: 'bi-fire' },
		{ title: 'Copo térmico', query: 'copo termico', from: 50, icon: 'bi-cup-hot' },
		{ title: 'Planner / agenda', query: 'planner agenda', from: 40, icon: 'bi-journal-bookmark' },
		{ title: 'Fone de ouvido bluetooth', query: 'fone de ouvido bluetooth', from: 90, icon: 'bi-headphones' },
		{ title: 'Smartwatch', query: 'smartwatch', from: 200, icon: 'bi-smartwatch' },
	],
	homem: [
		{ title: 'Perfume masculino', query: 'perfume masculino', from: 100, icon: 'bi-wind' },
		{ title: 'Kit de barbear', query: 'kit barba masculino', from: 50, icon: 'bi-scissors' },
		{ title: 'Carteira', query: 'carteira masculina couro', from: 50, icon: 'bi-wallet2' },
		{ title: 'Kit churrasco', query: 'kit churrasco', from: 70, icon: 'bi-fire' },
		{ title: 'Camisa de time', query: 'camisa de time', from: 120, icon: 'bi-trophy' },
		{ title: 'Copo térmico', query: 'copo termico', from: 50, icon: 'bi-cup-hot' },
		{ title: 'Mochila', query: 'mochila masculina', from: 90, icon: 'bi-backpack' },
		{ title: 'Jogo de ferramentas', query: 'jogo de ferramentas', from: 80, icon: 'bi-tools' },
		{ title: 'Caixa de som bluetooth', query: 'caixa de som bluetooth', from: 100, icon: 'bi-speaker' },
		{ title: 'Fone de ouvido bluetooth', query: 'fone de ouvido bluetooth', from: 90, icon: 'bi-headphones' },
		{ title: 'Smartwatch', query: 'smartwatch', from: 200, icon: 'bi-smartwatch' },
	],
	geral: [
		{ title: 'Cesta de chocolates', query: 'cesta de chocolate', from: 40, icon: 'bi-basket' },
		{ title: 'Livro best-seller', query: 'livros mais vendidos', from: 30, icon: 'bi-book' },
		{ title: 'Copo térmico', query: 'copo termico', from: 50, icon: 'bi-cup-hot' },
		{ title: 'Vela aromática', query: 'vela aromatica', from: 35, icon: 'bi-fire' },
		{ title: 'Jogo de tabuleiro', query: 'jogo de tabuleiro', from: 60, icon: 'bi-dice-5' },
		{ title: 'Manta de sofá', query: 'manta sofa', from: 60, icon: 'bi-house-heart' },
		{ title: 'Fone de ouvido bluetooth', query: 'fone de ouvido bluetooth', from: 90, icon: 'bi-headphones' },
		{ title: 'Caixa de som bluetooth', query: 'caixa de som bluetooth', from: 100, icon: 'bi-speaker' },
	],
};
