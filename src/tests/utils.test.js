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

});