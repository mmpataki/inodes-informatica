class ia4jsnips {

    /* markdown, be aware while formatting */
    getCard(obj) {
        let dlink = `data:text/octet-stream;base64,${btoa(obj.instrumentation)}`
        let content = `
# ${obj.title}

<a class='fa fa-download' href='${dlink}' download='ia4j.props' style='float: right; font-size: 0.8em'> Download</a>

__Product__ : [${obj.product}](${infaUtils.getConfig().infacode.url}/${obj.product}) / [${obj.component}](${infaUtils.getConfig().infacode.url}/${obj.product}/xref/${obj.component})

${obj.problem}

### Instrumentation
\`\`\`
${obj.instrumentation}
\`\`\`
        `

        return render('ia4jsnips', makeMarkdownViewer('viewer', content, ''))
    }

    getTags() { return [this.product.value, this.component.value] }

    getEditor(obj) {
        let self = this;
        let ele = render('ia4jsnip', {
            ele: "div", styles: { flexGrow: 1 }, children: [
                { ele: 'div', classList: '$form-row', children: [{ ele: 'input', iden: 'title', label: 'Title: ', attribs: { value: obj ? obj.title : "" } }] },
                infaUtils.makeProductComponentSelector('product', 'component', [obj ? obj.product : "", obj ? obj.component : ""], "pcsel $form-row"),
                { ele: 'div', styles: { height: '350px' }, label: 'Story / Problem:', children: [makeMarkDownEditor('problem', obj ? obj.problem : "", "ped")] },
                { ele: 'div', classList: '$form-col', children: [makeCodeEditor('instrumentation', 'java', obj ? obj.instrumentation : "", 'props', 'Instrumentation')] }
            ]
        }, (id, obj) => self[id] = obj);
        return ele;
    }

    getContent() {
        return {
            title: this.title.value,
            product: this.product.value,
            component: this.component.value,
            problem: this.problem.mdeditor.getMarkdown(),
            instrumentation: this.instrumentation.ceditor.toString()
        }
    }

}
