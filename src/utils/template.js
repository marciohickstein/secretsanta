class Template {
    constructor(template = null) {
        this.pairs = [];
        this.template = template;
    }

    setTemplate(template) {
        this.template = template;
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
            textOutput = textOutput.replaceAll(pair[0], pair[1]);
        }

        return textOutput;
    }
}

module.exports = Template;