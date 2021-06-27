class instances {

    constructor() {
        this.currentUrls = {}
    }

    getEditor(obj) {

        let klass = this;

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

        function InputTypeSelectionStory(args) {

            this.title = () => 'Pick a input type'

            this.tell = function () {
                this.ele = render('inp-type-select', {
                    ele: 'div',
                    children: [
                        {
                            ele: 'input',
                            classList: 'input-full-bkp',
                            postlabel: 'Import a docker',
                            lblClass: 'label-full-bkp',
                            attribs: {
                                type: 'radio',
                                name: 'input-type',
                                value: 'docker',
                                checked: true
                            }
                        },
                        { ele: 'br' },
                        {
                            ele: 'input',
                            classList: 'input-res-config',
                            postlabel: 'Manually enter the instance details',
                            lblClass: 'label-res-config',
                            attribs: {
                                type: 'radio',
                                name: 'input-type',
                                value: 'manual'
                            }
                        }
                    ]
                })
                return this.ele;
            }

            this.nextStoryClass = function () {
                let funcs = { 'docker': DockerSelectionStory, 'manual': ManualConfigStory }
                return funcs[this.ele.querySelector("input[type='radio']:checked").value]
            }

            this.moral = () => ({ option: this.ele.querySelector("input[type='radio']:checked").value })

            this.isCompleted = function () {
                return true
            }
        }

        class DockerSelectionStory {

            constructor() {

                this.title = () => 'Pick a docker'

                this.tell = () => {

                    let uniqid = Math.random(), self = this
                    let docker_instance = (inst) => {
                        return {
                            ele: 'label', classList: 'instance', attribs: { docker: inst }, children: [
                                { ele: 'input', attribs: { type: 'radio', name: `docker-${uniqid}` } },
                                { ele: 'span', classList: 'text', text: inst.CONTAINER_ID },
                                { ele: 'span', classList: 'text', text: inst.DESCRIPTION },
                                { ele: 'span', classList: 'text', text: `tag: ${inst.PVERSION}` },
                                { ele: 'span', classList: 'text', text: `Case# : ${inst.CASENUM}` }
                            ],
                            evnts: { click: function () { self.sdocker = this.docker } }
                        }
                    }

                    let ret = this.suggestions = render('instances', { ele: 'div', classList: 'suggestions' }, (id, ele) => this[id] = ele)

                    callWithWaitUI(ret, (done, setText) => {
                        setText('Fetching your dockers list')
                        ncors_get(`${infaUtils.getConfig().dockersys.url}/labconsole/api/v1/getdockers`, { email: app.currentUid() }, { 'Content-type': 'application/json' })
                            .then(resp => resp.json.data).then(instances => {
                                ret.innerHTML = instances.length == 0 ? 'Ooops.. looks like you don\'t have any active docker instances.' : ''
                                instances.forEach(inst => ret.appendChild(render('docker', docker_instance(inst), x => x)))
                            }).finally(_ => done())
                    })
                    return ret
                }

                this.isCompleted = () => {
                    return this.sdocker && 1
                }

                this.getErrMsg = () => {
                    return 'Select a instance'
                }

                this.nextStoryClass = () => SummaryStory

                this.moral = () => ({ ...this.docker })

            }

            preDestroy() {
                let prom = ncors_get(
                    `${infaUtils.getConfig().dockersys.url}/labconsole/api/v1/getdockerMetadata`,
                    { 'CONTAINER_ID': this.sdocker.CONTAINER_ID },
                    { 'Content-Type': 'application/json' }
                ).then(resp => JSON.parse(resp.json.data[0].META_DATA)).then(resp => {

                    let parseFunctions = [parseDockerApiOutputV1, parseDockerApiOutputV2]

                    parseFunctions.forEach(f => {
                        try {
                            this.docker = f(resp);
                        } catch (error) {
                            console.error(error)
                            console.log(`failed to parse using : ${f.name}`)
                        }
                    })
                    if (!this.docker) {
                        showError('Cannot parse the docker API response. Connect to admin to fix this, Till then use the manual entry')
                    }
                })
                callWithWaitUI(this.suggestions, (d, s) => {
                    s('Fetching complete docker details')
                    prom.finally(_ => d())
                })
                return prom
            }
        }

        class ManualConfigStory {
            title() { return 'Fill in all the details of the instance' }
            tell() {
                let kvpairtemplate = function (keyname, valuename, key, value, jsonKeyName, jsonValueName) {
                    return {
                        ele: "div", classList: "kvp", children: [
                            { ele: "input", classList: "kvp-k", attribs: { placeholder: keyname, width: "100px", value: key, keyName: jsonKeyName } },
                            { ele: "input", classList: "kvp-v", attribs: { placeholder: valuename, value, keyName: jsonValueName } },
                            { ele: "button", text: "-", evnts: { click: function (e) { e.target.parentNode.remove() } } }
                        ]
                    }
                }
                let urlpairtemplate = (u) => kvpairtemplate("tag / name", "url", u ? u.tag : "", u ? u.url : "", "tag", "url")
                let metapairtemplate = (m) => kvpairtemplate("key", "value", m ? m.key : "", m ? m.value : "", "key", "value")
                let renderable = function (obj) {
                    return {
                        ele: "div",
                        attribs: { classList: "pane" },
                        children: [
                            {
                                ele: "div", iden: 'manInput', classList: 'manual-instance-entry', children: [
                                    {
                                        ele: "div", classList: 'ad-inps', children: [
                                            { ele: "input", classList: "ad-inp", label: "app username:", value: obj ? obj.appusername : "" },
                                            { ele: "input", classList: "ad-inp", label: "app password:", value: obj ? obj.apppassword : "" }
                                        ]
                                    },
                                    {
                                        ele: "div", classList: 'ad-inps', children: [
                                            { ele: "input", classList: "ad-inp", label: "box username:", value: obj ? obj.boxusername : "" },
                                            { ele: "input", classList: "ad-inp", label: "box password:", value: obj ? obj.boxpassword : "" }
                                        ]
                                    },
                                    {
                                        ele: "div", classList: 'ad-inps', children: [
                                            { ele: "input", classList: "ad-inp", label: "host / ip addr :", value: obj ? obj.ipaddr : "" },
                                            { ele: "input", classList: "ad-inp", label: "install location:", value: obj ? obj.installloc : "" }
                                        ]
                                    },
                                    {
                                        ele: 'div', classList: 'urlnmeta', children: [
                                            {
                                                ele: 'div', iden: 'urlInput', children: [
                                                    { ele: "b", classList: "urls-label", text: "URLs" },
                                                    ...(obj ? obj.urls.map(u => urlpairtemplate(u)) : []),
                                                    {
                                                        ele: "button", text: "Add URL", classList: "add-url", evnts: {
                                                            click: function () { this.parentNode.insertBefore(render('instances', urlpairtemplate()), this) }
                                                        }
                                                    }
                                                ]
                                            },
                                            {
                                                ele: 'div', iden: 'metaInput', children: [
                                                    { ele: "b", classList: "urls-label", text: "Metadata" },
                                                    ...((obj && obj.meta) ? obj.meta.map(m => metapairtemplate(m)) : []),
                                                    {
                                                        ele: "button",
                                                        text: "Add key-value pair",
                                                        classList: "add-url",
                                                        evnts: {
                                                            click: function () { this.parentNode.insertBefore(render('instances', metapairtemplate()), this) }
                                                        }
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                }
                return render('instances', renderable(obj), (i, e) => this[i] = e)
            }

            nextStoryClass() { return SummaryStory }
            moral() {
                let inputs = this.manInput.getElementsByTagName('input');
                let vals = [];
                for (let i = 0; i < inputs.length; i++) {
                    vals.push(inputs[i].value);
                }
                let ret = {
                    appusername: vals[0], apppassword: vals[1],
                    boxusername: vals[2], boxpassword: vals[3],
                    ipaddr: vals[4], installloc: vals[5],
                    urls: [],
                    meta: []
                };
                let fill = (eleArr, arr) => {
                    for (let i = 0; i < eleArr.length; i += 2) {
                        let x = {};
                        x[eleArr[i].keyName] = eleArr[i].value
                        x[eleArr[i + 1].keyName] = eleArr[i + 1].value
                        arr.push(x)
                    }
                }
                fill(this.metaInput.getElementsByTagName('input'), ret.meta)
                fill(this.urlInput.getElementsByTagName('input'), ret.urls)
                console.log(ret)
                return ret
            }

            isCompleted() {
                return true
            }
            getErrMsg() {
                return 'Choose a file and version'
            }
        }

        class SummaryStory {
            constructor(arg) {
                this.title = () => 'Awesome! now add some tags and publish'

                this.tell = () => {
                    return render('instances', {
                        ele: 'div', styles: { display: 'flex', position: 'relative' }, children: [
                            { ele: klass.getCard(arg, { id: Math.random() }), preBuilt: true}
                        ]
                    })
                }
                this.moral = () => { return arg }
            }
        }

        let ele = render('instances', { ele: 'div' });
        this.storyTeller = new StoryTeller(ele);
        let storyClass = obj ? ManualConfigStory : InputTypeSelectionStory;
        this.storyTeller.openStory(storyClass, obj)
        return ele;
    }

    getContent() {
        let story = this.storyTeller.currentStory();
        if (story && story.constructor.name == 'SummaryStory') {
            return story.moral()
        }
        throw new Error('Please provide all inputs')
    }

    getCard(obj, doc) {
        let objIden = doc.id
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
        items.filter(item => item.readState == 'CAN_READ').forEach(item => {
            let postItems = [];
            item.content.urls.forEach(u => {
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
