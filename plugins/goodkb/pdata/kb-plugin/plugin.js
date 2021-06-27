class goodkb {

    getCard(obj) {
        let template = function(obj) {
            return {
                ele: 'div',
                classList: 'container',
                children: [
                    {
                        ele: 'span',
                        classList: 'title',
                        text: obj.title || "<no title, bug?>"
                    },
                    {
                        ele: 'a',
                        classList: 'url',
                        attribs : {
                            href: obj.url || "<no link, bug?>",
                            target: "_blank"
                        },
                        text: obj.url || "<no link, bug?>"
                    }
                ]
            }
        }
        return render('goodkb', template(obj));
    }

    getEditor(obj) {
        let self = this;
        let renderable = function (obj) {
            return {
                ele: "div",
                children: [
                    {
                        ele: "input",
                        classList: "input",
                        label: "Title",
                        iden: "title",
                        attribs: {
                            value: obj ? obj.title : ""
                        }
                    },
                    {
                        ele: "input",
                        classList: "input",
                        label: "URL",
                        iden: "url",
                        attribs: {
                            value: obj ? obj.url : ""
                        }
                    }
                ]
            }
        }
        let ele = render('goodkb-ed', renderable(obj), (id, obj) => {
            self[id] = obj
        });
        return ele;
    }

    getContent() {
        return {
            url: this.url.value,
            title: this.title.value
        };
    }

    getCopyContent(doc) {
        let obj = JSON.parse(doc.content)
        return `<b>${obj.title}</b><br/><a href="${obj.url}">${obj.url}</a><br/>`
    }

}