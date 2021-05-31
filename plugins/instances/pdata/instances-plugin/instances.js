class instances {

    currentUrls = {}

    constructor() {
        this.elems = {}
    }

    getEditor(obj) {
        let self = this;
        let APP_URLS = function (url) {
            return {
                ele: "div",
                classList: "app-urls",
                attribs: {},
                children: [
                    {
                        ele: "input",
                        classList: "app-tag",
                        attribs: {
                            placeholder: "tag / name",
                            width: "100px",
                            value: url ? url.tag : ""
                        }
                    },
                    {
                        ele: "input",
                        classList: "app-url",
                        attribs: {
                            placeholder: "url",
                            value: url ? url.url : ""
                        }
                    },
                    {
                        ele: "button",
                        classList: "remove-url",
                        text: "-",
                        evnts: {
                            click: function (e) {
                                e.target.parentNode.remove()
                            }
                        }
                    }
                ]
            }
        }
        let renderable = function (obj) {
            if (obj) {
                obj = JSON.parse(obj.content)
            }
            return {
                ele: "div",
                iden: "app-editor",
                attribs: { classList: "pane" },
                children: [
                    {
                        ele: 'h3',
                        text: 'Your dockers'
                    },
                    {
                        ele: 'div',
                        iden: 'suggestions',
                        classList: 'suggestions',
                        text: 'Your dockers will appear here'
                    },
                    {
                        ele: 'h3',
                        text: 'Manual instance entry'
                    },
                    {
                        ele: "div",
                        classList: 'manual-instance-entry',
                        children: [
                            {
                                ele: "div",
                                children: [
                                    {
                                        ele: "input",
                                        classList: "app-user",
                                        attribs: {
                                            placeholder: "app username",
                                            value: obj ? obj.appusername : ""
                                        }
                                    },
                                    {
                                        ele: "input",
                                        classList: "app-password",
                                        attribs: {
                                            placeholder: "app password",
                                            value: obj ? obj.apppassword : ""
                                        }
                                    }
                                ]
                            },
                            {
                                ele: "div",
                                children: [
                                    {
                                        ele: "input",
                                        classList: "box-user",
                                        attribs: {
                                            placeholder: "box username",
                                            value: obj ? obj.boxusername : ""
                                        }
                                    },
                                    {
                                        ele: "input",
                                        classList: "box-password",
                                        attribs: {
                                            placeholder: "box password",
                                            value: obj ? obj.boxpassword : ""
                                        }
                                    }
                                ]
                            },
                            {
                                ele: "div",
                                children: [
                                    {
                                        ele: "input",
                                        classList: "ip-addr",
                                        attribs: {
                                            placeholder: "ip addr",
                                            value: obj ? obj.ipaddr : ""
                                        }
                                    },
                                    {
                                        ele: "input",
                                        classList: "install-loc",
                                        attribs: {
                                            placeholder: "install location",
                                            value: obj ? obj.installloc : ""
                                        }
                                    }
                                ]
                            },
                            {
                                ele: "span",
                                classList: "urls-label",
                                text: "URLs"
                            },
                            ...(obj ? obj.urls.map(u => APP_URLS(u)) : []),
                            {
                                ele: "button",
                                text: "Add URL",
                                classList: "add-url",
                                evnts: {
                                    click: function (e) {
                                        e.target.parentNode.insertBefore(render('instances', APP_URLS()), e.target);
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        }

        let parseDockerApiOutputV1 = function (resp) {
            let O = {};
            Object.keys(resp).forEach(k => {
                O[k] = {}
                resp[k].forEach(elem => {
                    O[k][Object.keys(elem)[0]] = elem[Object.keys(elem)[0]]
                })
            })
            console.log(O)
            let urls = [];
            let meta = [];

            Object.keys(O['URL details']).forEach(k => {
                if (k.toLowerCase().includes('url')) {
                    urls.push({ tag: k, url: O['URL details'][k] })
                } else {
                    meta.push({ key: k, value: O['URL details'][k] })
                }
            })

            return {
                appusername: O['URL details']['Username'],
                apppassword: O['URL details']['Username'],
                boxusername: O['Docker Host and credentials']['User'],
                boxpassword: O['Docker Host and credentials']['Password'],
                ipaddr: O['Docker Host and credentials']['Host name'],
                installloc: O['URL details']['EDC installation'],
                urls: urls,
                meta: meta,
                importedTags: [
                    O['Docker Host and credentials']['Cloud'].toLowerCase(),
                    O['Docker Host and credentials']['Template'].toLowerCase(),
                ]
            }
        }

        let parseDockerApiOutputV2 = function (resp) {
            let O = resp;

            let urls = [];
            let meta = [];

            let metArr = O["Docker Port Mappings"][0]["Application Port"]
            metArr.forEach(kvp => {
                let k = kvp['Container Port'].toLowerCase(), v = kvp['Host Port'];
                if (k.includes('url')) {
                    urls.push({ tag: k, url: v })
                } else {
                    meta.push({ key: k, value: v })
                }
            })

            let vmap = {}, uvmap = {}

            O['Docker Host and credentials'].forEach(kvp => {
                Object.keys(kvp).forEach(k => {
                    vmap[k] = kvp[k]
                })
            });

            O['Docker Port Mappings'][0]['Application Port'].forEach(kvp => {
                Object.keys(kvp).forEach(k => {
                    uvmap[kvp['Container Port']] = kvp['Host Port']
                })
            });

            return {
                appusername: uvmap['Username'],
                apppassword: uvmap['Password'],
                boxusername: vmap['Username'],
                boxpassword: vmap['Password'],
                ipaddr: vmap['Host name'],
                installloc: uvmap['EDC installation'],
                urls: urls,
                meta: meta,
                importedTags: [
                    vmap['Template'].toLowerCase()
                ]
            }
        }

        let docker_instance = function (inst) {
            return {
                ele: 'div',
                classList: 'instance',
                children: [
                    {
                        ele: 'span',
                        classList: 'text',
                        text: inst.CONTAINER_ID
                    },
                    {
                        ele: 'span',
                        classList: 'text',
                        text: inst.DESCRIPTION
                    },
                    {
                        ele: 'span',
                        classList: 'text',
                        text: `tag: ${inst.PVERSION}`
                    },
                    {
                        ele: 'span',
                        classList: 'text',
                        text: `Case# : ${inst.CASENUM}`
                    },
                    {
                        ele: 'button',
                        text: 'Import',
                        evnts: {
                            click: function () {
                                console.log('importing ', inst)
                                nocors_get(
                                    `${infaUtils.getConf().dockersys.url}/labconsole/api/v1/getdockerMetadata`,
                                    { 'CONTAINER_ID': inst.CONTAINER_ID },
                                    { 'Content-Type': 'application/json' }
                                ).then(resp => {
                                    resp = JSON.parse(JSON.parse(resp.response).data[0].META_DATA)
                                    let parseFunctions = [parseDockerApiOutputV1, parseDockerApiOutputV2]

                                    parseFunctions.forEach(f => {
                                        try {
                                            self.importedContent = f(resp);
                                        } catch (error) {
                                            console.error(error)
                                            console.log(`failed to parse using : ${f}`)
                                        }
                                    })

                                    console.log(self.importedContent)
                                    if (self.importedContent) {
                                        inodes.post()
                                    } else {
                                        showError('Cannot parse the docker API response. Connect to admin to fix this, Till then use the manual entry')
                                    }
                                })
                            }
                        }
                    }
                ]
            }
        }

        let ret = render('instances', renderable(obj), (id, e) => { self.elems[id] = e })

        // get suggestions from dockers list
        nocors_get(
            `${infaUtils.getConf().dockersys.url}/labconsole/api/v1/getdockers`,
            { email: getCurrentUser() },
            { 'Content-Type': 'application/json' }
        ).then((resp) => {
            let instances = JSON.parse(resp.response).data
            instances.forEach(inst => {
                self.elems.suggestions.appendChild(render('docker', docker_instance(inst), x => x))
            })
            if (instances.length == 0) {
                self.elems.suggestions.innerHTML += 'Ooops.. looks like you don\'t have any active docker instances.'
            }
        })

        return ret;
    }

    getContent() {
        if (this.importedContent) {
            let x = this.importedContent;
            this.importedContent = undefined;
            return x;
        }
        let inputs = this.elems['app-editor'].getElementsByTagName('input');
        let vals = [];
        for (let i = 0; i < inputs.length; i++) {
            vals.push(inputs[i].value);
        }
        let ret = {
            appusername: vals[0],
            apppassword: vals[1],
            boxusername: vals[2],
            boxpassword: vals[3],
            ipaddr: vals[4],
            installloc: vals[5],
            urls: []
        };
        for (let i = 6; i < vals.length; i += 2) {
            ret.urls.push({ tag: vals[i], url: vals[i + 1] })
        }
        return ret;
    }

    getCard(obj) {
        let objIden = obj.id
        obj = JSON.parse(obj.content)
        let self = this;
        let CARD_META_URL = function (k, v, elem) {
            return {
                ele: "tr",
                classList: "card-metadata",
                children: [
                    {
                        ele: "td",
                        classList: "card-metatag",
                        text: k
                    },
                    {
                        ele: "td",
                        classList: "card-meta",
                        children: [
                            {
                                ele: elem,
                                classList: "card-meta",
                                attribs: {
                                    href: v,
                                    target: "_blank"
                                },
                                text: v
                            }
                        ]
                    }
                ]
            }
        }
        let card_url_template = function (k, v, id) {
            return {
                ele: 'span',
                classList: 'urltag',
                iden: self.makeUrlId(id, k),
                attribs: {
                    title: 'fetching the status...'
                },
                evnts: {
                    mouseover: function () {
                        if (this.data) {
                            let val = this.data;
                            this.title = `${val.message} (refreshed ${Math.max(0, Math.round((Date.now() - val.lastChkTime * 1000) / 1000))}s ago)`
                        }
                    }
                },
                children: [
                    {
                        ele: 'a',
                        text: k,
                        attribs: { href: v, target: "_blank" }
                    },
                    {
                        ele: 'span',
                        classList: 'urlstatus-refresher',
                        attribs: {
                            title: 'force refresh status',
                            innerHTML: '&#x21BB;',
                            urlStatusReqData: {
                                extra: self.makeUrlId(id, k),
                                url: v,
                                force: 'true'
                            }
                        },
                        evnts: {
                            click: function () {
                                self.fetchStatus([this.urlStatusReqData])
                            }
                        }
                    }
                ]
            }
        }
        let card = {
            ele: "div",
            classList: "card",
            children: [
                {
                    ele: "div",
                    classList: 'details',
                    children: [
                        {
                            ele: "div",
                            classList: 'box-creds',
                            children: [
                                {
                                    ele: "span",
                                    classList: "card-boxcreds",
                                    text: "Hostname / IP"
                                },
                                {
                                    ele: "span",
                                    classList: "card-boxusername",
                                    text: `${obj.ipaddr}`
                                }
                            ]
                        },
                        {
                            ele: "div",
                            classList: "box-creds",
                            children: [
                                {
                                    ele: "span",
                                    classList: "card-boxcreds",
                                    text: "Box credentials"
                                },
                                {
                                    ele: "span",
                                    classList: "card-boxusername",
                                    text: `${obj.boxusername} / ${obj.boxpassword}`
                                },

                            ]
                        },
                        {
                            ele: "div",
                            classList: 'box-creds',
                            children: [
                                {
                                    ele: "span",
                                    classList: "card-boxcreds",
                                    text: "Installation location"
                                },
                                {
                                    ele: "span",
                                    classList: "card-boxusername",
                                    text: `${obj.installloc}`
                                }
                            ]
                        },
                        {
                            ele: "div",
                            classList: "app-creds",
                            children: [
                                {
                                    ele: "span",
                                    classList: "card-appcreds",
                                    text: "App credentials"
                                },
                                {
                                    ele: "span",
                                    classList: "card-appusername",
                                    text: `${obj.appusername} / ${obj.apppassword}`
                                }
                            ]
                        },
                        {
                            ele: 'a',
                            text: '...',
                            styles: {
                                cursor: 'pointer',
                                display: obj.meta ? 'block' : 'none',
                                'margin-left': '5px'
                            },
                            attribs: {
                                title: 'Other metadata'
                            },
                            evnts: {
                                click: function () {
                                    this.nextSibling.style.display = this.nextSibling.style.display == 'none' ? 'block' : 'none';
                                }
                            }
                        },
                        {
                            ele: "table",
                            classList: "card-metadata-container",
                            styles: { display: 'none' },
                            children: []
                        },
                        {
                            ele: "div",
                            classList: "card-url-container",
                            children: []
                        },
                    ]
                },
                {
                    ele: 'div',
                    classList: "icons",
                    children: [
                        {
                            ele: "a",
                            classList: "card-boxlogin",
                            attribs: {
                                href: self.getPuttyUrl(obj),
                                innerHTML: `<img alt='SSH' src="./instances-plugin/images/putty.png" style="width: 20px"/>`,
                                title: 'SSH'
                            }
                        },
                        {
                            ele: "a",
                            classList: "card-boxlogin",
                            attribs: {
                                href: self.getScpUrl(obj),
                                innerHTML: `<img alt='SCP' src="./instances-plugin/images/winscp.jpg" style="width: 20px"/>`,
                                title: 'SCP'
                            }
                        },
                        {
                            ele: "a",
                            classList: "card-boxlogin",
                            attribs: {
                                href: `ms-rd://full%20address:s:${obj.ipaddr}`,
                                innerHTML: `<img alt='RDP' src="./instances-plugin/images/rdp.png" style="width: 20px"/>`,
                                title: 'RDP'
                            }
                        }
                    ]
                }
            ]
        }
        let start = 6;
        obj.urls.forEach(u => {
            card.children[0].children[start].children.push(card_url_template(u.tag, u.url, objIden))
        })
        if (obj.meta) {
            obj.meta.forEach(u => {
                card.children[0].children[start - 1].children.push(CARD_META_URL(u.key, u.value, 'span'))
            })
        }
        return render('instances', card, (id, ele) => {
            if (id.startsWith('url:')) {
                this.currentUrls[id] = ele
            }
        });
    }

    getPuttyUrl(obj) {
        return `ssh://${obj.boxusername}:${encodeURIComponent(obj.boxpassword)}@${obj.ipaddr}`
    }

    getScpUrl(obj) {
        return `scp://${obj.boxusername}:${encodeURIComponent(obj.boxpassword)}@${obj.ipaddr}`
    }

    getTags() {
        if (this.importedTags) {
            let t = this.importedTags;
            this.importedTags = undefined;
            return t;
        }
        return [];
    }
    makeUrlId(id, tag) {
        return `url:${id}:${tag}`
    }

    fetchStatus(postItems) {
        let self = this;
        infaUtils.cpost('/testconn', { items: postItems }, { 'Content-Type': 'application/json' })
            .then(x => {
                let resp = JSON.parse(x.response)
                resp.items.forEach(val => {
                    self.currentUrls[val.extra].classList.remove('instance-up', 'instance-down')
                    self.currentUrls[val.extra].classList.add(val.message == 'up' ? 'instance-up' : 'instance-down')
                    self.currentUrls[val.extra].data = val
                })
            })
    }

    postDisplay(items) {
        items.forEach(item => {
            let postItems = [];
            JSON.parse(item.content).urls.forEach(u => {
                postItems.push({
                    url: u.url,
                    extra: this.makeUrlId(item.id, u.tag)
                })
            })
            this.fetchStatus(postItems)
        })
    }

    getCopyContent(doc) {
        let obj = JSON.parse(doc.content)
        return `Hostname: <b>${obj.ipaddr}</b> &nbsp; <a href='${this.getPuttyUrl(obj)}'>putty</a> &nbsp; <a href='${this.getScpUrl(obj)}'>scp</a><br/>
Box credentials : <b>${obj.boxusername} / ${obj.boxpassword}</b><br/>
App credentials : <b>${obj.appusername} / ${obj.apppassword}</b><br/>
Installation location : <b>${obj.installloc}</b><br/>
URLs : ${obj.urls.map(url => `<a href="${url.url}">${url.tag.toLowerCase()}</a>`).join(' &nbsp;|&nbsp; ')}<br/>
<i>(To view more info about this instance in <b>inodes</b> click <a href='${document.location + `/?q=@${doc.id}`}'>here</a></i>)`
    }

}
