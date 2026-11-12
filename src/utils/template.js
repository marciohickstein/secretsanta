const path = require('path');
const { readFileSync } = require('fs');
const { escapeHtml } = require('./security');

class Template {
    constructor(template = null, fromFile = true) {
        this.pairs = [];
        this.setTemplate(template, fromFile);
    }

    readFile(file) {
        return readFileSync(path.join(process.cwd(), 'src', 'templates', file), 'utf-8');
    }

    setTemplate(template, fromFile = true) {
        this.template = (template && fromFile) ? this.readFile(template) : template;
        // Templates HTML recebem os valores com escape para evitar injecao de HTML nos e-mails
        this.escape = Boolean(template && fromFile && /\.html?$/i.test(template));
    }

    assign(key, value) {
        const pair = [`{${key}}`, value];
        this.pairs.push(pair);
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