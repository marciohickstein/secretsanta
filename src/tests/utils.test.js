"use strict"

const util = require('@utils/util');
const Template = require('@utils/template');

describe(`Testing utils...`, () => {
	it(`Test getRootPath():`, () => {
		const rootPath = util.getRootPath();
		const processCwd = process.cwd();

		expect(rootPath).toBe(processCwd);
	})

	it(`Test resolvePath():`, () => {
		const rootPath = util.getRootPath();
		const pathsToResolve = [ `${rootPath}/./`, `${rootPath}/../secretsanta` ];
		
		pathsToResolve.forEach((path) => {
			const pathToResolve = util.resolvePath(path);
			expect(rootPath).toBe(pathToResolve);
		})
	})

	it(`Test shuffleArray():`, () => {
		const array = [ 'Marcio', 'Claudio', 'Leo', 'Eduardo', 'Vitor', 'Renata', 'Roberta', 'Ana Paula' ];
		const arrayShuffled =	util.shuffleArray(array);


		// console.log(`array:`, arrayShuffled);
		// console.log(`array shuffled: `, arrayShuffled)
		expect(array).toEqual(expect.arrayContaining(arrayShuffled));
	})

	it(`shuffleArray() nao altera o array original e mantem os mesmos elementos`, () => {
		const array = [1, 2, 3, 4, 5, 6, 7, 8];
		const arrayShuffled = util.shuffleArray(array);

		expect(array).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
		expect([...arrayShuffled].sort((a, b) => a - b)).toEqual(array);
		expect(util.shuffleArray('nao e array')).toEqual([]);
	})

	it(`shuffleArray() gera todas as ordens com a mesma frequencia`, () => {
		// 4 elementos = 24 ordens possiveis; cada uma deve sair ~1/24 das vezes
		const runs = 48000;
		const expected = runs / 24;
		const counts = {};

		for (let i = 0; i < runs; i++) {
			const key = util.shuffleArray(['a', 'b', 'c', 'd']).join('');
			counts[key] = (counts[key] || 0) + 1;
		}

		expect(Object.keys(counts)).toHaveLength(24);
		// Desvio padrao ~44; a margem de 15% (300) fica muito acima da variacao aleatoria
		for (const count of Object.values(counts)) {
			expect(Math.abs(count - expected)).toBeLessThan(expected * 0.15);
		}
	})

	it(`Test createListFriends():`, () => { 
		const list = [ 'Marcio', 'Claudio', 'Leo' ];
		const listFriends = util.createListFriends(list);

		expect(listFriends).toHaveLength(3);
		expect(listFriends[0].friend).toBe('Marcio');
		expect(listFriends[0].receiver).toBe('Claudio');
		
		expect(listFriends[1].friend).toBe('Claudio');
		expect(listFriends[1].receiver).toBe('Leo');
		
		expect(listFriends[2].friend).toBe('Leo');
		expect(listFriends[2].receiver).toBe('Marcio');
		
	})

	it(`Test drawParticipants():`, () => { 
		const list = [ 'Marcio', 'Claudio', 'Leo' ];
		const listFriends = util.drawParticipants(list);

		// console.log(`list:`, list);
		// console.log(`listFriends:`, listFriends);
		
		expect(listFriends).toHaveLength(3);
		expect(list.includes(listFriends[0].friend)).toBe(true);
		expect(list.includes(listFriends[0].receiver)).toBe(true);
		
		expect(list.includes(listFriends[1].friend)).toBe(true);
		expect(list.includes(listFriends[1].receiver)).toBe(true);
		
		expect(list.includes(listFriends[2].friend)).toBe(true);
		expect(list.includes(listFriends[2].receiver)).toBe(true);
	})

	it(`Test Template(): `, () => {

		const text = `{MENSAGEM_OLA} {NOME_CONVIDADO},\nMeu nome eh {NOME_PROGRAMADOR} programador que desenvolveu esta funcao em {LINGUAGEM}`;

		const template = new Template(text, false);

		template.assign('MENSAGEM_OLA', 'Ola');
		template.assign('NOME_CONVIDADO', 'Leo');
		template.assign('NOME_PROGRAMADOR', 'Marcio');
		template.assign('LINGUAGEM', 'Javascript');

		const finalText = 
		`${template.getValue('MENSAGEM_OLA')} ${template.getValue('NOME_CONVIDADO')},\nMeu nome eh ${template.getValue('NOME_PROGRAMADOR')} programador que desenvolveu esta funcao em ${template.getValue('LINGUAGEM')}`;

		const textReplaced = template.replace();

		expect(textReplaced).toBe(finalText);
	})


	it(`Template HTML escapa os valores: `, () => {
		const template = new Template('emailhost.html');
		template.assign('HOST_NAME', '<img src=x onerror=alert(1)>');
		template.assign('URL_PANEL', 'http://x.com/?a=1&b="2"');

		const html = template.replace();

		expect(html).not.toContain('<img src=x');
		expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
		expect(html).toContain('http://x.com/?a=1&amp;b=&quot;2&quot;');
	})

	it(`Template de texto nao escapa os valores: `, () => {
		const template = new Template('texthost.txt');
		template.assign('HOST_NAME', 'Ana & Bia');

		expect(template.replace()).toContain('Ana & Bia');
	})
});
