class Template {
    constructor(template) {
        this.pairs = [];
        this.tamplate = template;
    }

    clear() {
        this.pairs.length = 0;
    }

    assign(key, value) {
        const pair = [`{${key}}`, value];
        this.pairs.push(pair);
    }
    
    replace() {
        let textOutput = this.tamplate;

        for (const pair of this.pairs) {
            textOutput = textOutput.replaceAll(pair[0], pair[1]);
        }

        return textOutput;
    }
}

module.exports = Template;