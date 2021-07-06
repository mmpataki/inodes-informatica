class goodkb {

    getCard(obj) {
        return render('goodkb', {
            ele: 'div', classList: 'container', children: [
                { ele: 'span', classList: 'title', text: obj.title || "<no title, bug?>" },
                { ele: 'a', classList: 'url', attribs: { href: obj.url || "#", target: "_blank" }, text: obj.url || "<no link, bug?>" }
            ]
        });
    }

    getEditor(obj) {
        return render('goodkb-ed', {
            ele: "div", classList: '$form', children: [
                { ele: 'div', classList: '$form-row', children: [{ ele: "input", label: "Title: ", iden: "title", value: obj ? obj.title : "" }] },
                { ele: 'div', classList: '$form-row', children: [{ ele: "input", label: "URL: ", iden: "url", value: obj ? obj.url : "" }] }
            ]
        }, (id, obj) => this[id] = obj)
    }

    getContent() {
        return { url: this.url.value, title: this.title.value }
    }

    getCopyContent(obj) {
        return `<b>${obj.title}</b><br/><a href="${obj.url}">${obj.url}</a><br/>`
    }

}