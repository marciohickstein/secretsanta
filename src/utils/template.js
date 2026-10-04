const path = require('path');
const { readFileSync } = require('fs');
const { escapeHtml } = require('./security');

class Template {
    constructor(template = null, fromFile = true) {
        this.pairs = [];
        this.setTemplate(template, fromFile);
    }

    readFile(file) {
        try {
            const projectRoot = process.cwd();
            const fullPathOfFile = path.join(projectRoot, 'src', 'templates', file);

            const content = readFileSync(fullPathOfFile, 'utf-8');

            return content;
        } catch (error) {
            throw new Error(error);
        }
    }

    setTemplate(template, fromFile = true) {
        this.template = (template && fromFile) ? this.readFile(template) : template;
        // Templates HTML recebem os valores com escape para evitar injecao de HTML nos e-mails
        this.escape = Boolean(template && fromFile && /\.html?$/i.test(template));
        return true;
    }

    clear() {
        this.pairs.length = 0;
    }

    assign(key, value) {
        const pair = [`{${key}}`, value];
        this.pairs.push(pair);
    }

    getValue(tag) {
        const internalTag = `{${tag}}`;

        for (const pair of this.pairs) {
            if (pair[0] === internalTag) {
                return pair[1];
            }
        }

        return null;
    }

    replace() {
        if (this.template == null) {
            return '';
        }

        let textOutput = this.template;

        for (const pair of this.pairs) {
            const value = this.escape ? escapeHtml(pair[1]) : String(pair[1] ?? '');
            textOutput = textOutput.replaceAll(pair[0], () => value);
        }

        return textOutput;
    }
}

module.exports = Template;