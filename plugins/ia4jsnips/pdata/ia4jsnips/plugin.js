class ia4jsnips {

    getCard(obj) {
        return render('ia4jsnips', {
            ele: 'div', children: [
                { ele: 'h2', text: obj.title },
                {
                    ele: 'div', styles: { marginBottom: '40px' }, children: [
                        {
                            ele: 'div', styles: { display: 'inline' }, html: `
                                <b>Product:</b> 
                                <a href='${infaUtils.getConfig().infacode.url}/${obj.product}' target='_blank'>${obj.product}</a>
                                / 
                                <a href='${infaUtils.getConfig().infacode.url}/${obj.product}/xref/${obj.component}'>${obj.component}</a>
                            `
                        },
                        { ele: 'a', attribs: { classList: 'fa fa-download', href: `data:text/octet-stream;base64,${btoa(obj.instrumentation)}`, download: 'ia4j.props' }, text: ' Download', styles: { float: 'right', fontSize: '0.8em' } }
                    ]
                },
                makeMarkdownViewer('viewer', obj.problem, ''),
                {
                    ele: 'div', styles: { marginTop: '40px' }, children: [
                        { ele: 'pre', label: 'Instrumentation', classList: 'instr', text: obj.instrumentation }
                    ]
                }
            ]
        })
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
