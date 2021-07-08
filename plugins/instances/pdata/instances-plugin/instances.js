class instances {

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

                    let ret = this.suggestions = render('instances', { ele: 'div', classList: 'dockers' }, (id, ele) => this[id] = ele)

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
                let kvpairtemplate = function (keyname, valuename, key, value, jsonKeyName, jsonValueName, nfunc) {
                    return {
                        ele: "div", classList: "kvp", children: [
                            { ele: "input", classList: "kvp-k", attribs: { placeholder: keyname, width: "100px", value: key, keyName: jsonKeyName } },
                            { ele: "input", classList: "kvp-v", attribs: { placeholder: valuename, value, keyName: jsonValueName } },
                            { ele: "i", title: "add", classList: "$fa $fa-plus-circle", styles: {margin: '0px 2px'}, evnts: { click: function () { this.parentNode.parentNode.insertBefore(render('instances', nfunc({})), this.parentNode) } } },
                            { ele: "i", title: 'remove', classList: "$fa $fa-minus-circle", styles: {margin: '0px 2px'}, evnts: { click: function (e) { e.target.parentNode.remove() } } }
                        ]
                    }
                }
                let urlpairtemplate = (u) => kvpairtemplate("tag / name", "url", u.tag || "", u.url || "", "tag", "url", urlpairtemplate)
                let metapairtemplate = (m) => kvpairtemplate("key", "value", m.key || "", m.value || "", "key", "value", metapairtemplate)
                let renderable = function (obj) {
                    let makeKVInputs = (k1, v1, k2, v2) => ({
                        ele: "div", classList: 'ad-inps', children: [
                            { ele: "input", classList: "ad-inp", label: k1, value: v1 },
                            { ele: "input", classList: "ad-inp", label: k2, value: v2 }
                        ]
                    })
                    return {
                        ele: "div",
                        attribs: { classList: "pane" },
                        children: [
                            {
                                ele: "div", iden: 'manInput', classList: 'manual-instance-entry', children: [
                                    makeKVInputs("app username:", obj ? obj.appusername : "", "app password:", obj ? obj.apppassword : ""),
                                    makeKVInputs("box username:", obj ? obj.boxusername : "", "box password:", obj ? obj.boxpassword : ""),
                                    makeKVInputs("host / ip addr :", obj ? obj.ipaddr : "", "install location:", obj ? obj.installloc : ""),
                                    {
                                        ele: 'div', classList: 'urlnmeta', children: [
                                            {
                                                ele: 'div', iden: 'urlInput', children: [
                                                    { ele: "label", styles: { display: 'block', marginTop: '5px' }, text: "URLs" },
                                                    ...((obj && obj.urls && obj.urls.length > 0 ? obj.urls : [{}]).map(u => urlpairtemplate(u)))
                                                ]
                                            },
                                            {
                                                ele: 'div', iden: 'metaInput', children: [
                                                    { ele: "label", styles: { display: 'block', marginTop: '5px' }, text: "Metadata" },
                                                    ...((obj && obj.meta && obj.meta.length > 0 ? obj.meta : [{}]).map(m => metapairtemplate(m)))
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
                            { ele: klass.getCard(arg, { id: Math.random() }), preBuilt: true }
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

    getCard(obj) {

        /* filler */
        if (app.loggedIn())
            obj.appusername = obj.appusername.replace('nt_user_id', app.currentUid())

        let card_meta_kv = (k, v) => ({
            ele: "tr", classList: "card-metadata", children: [
                { ele: "td", classList: "kcolonv-key", text: k },
                { ele: "td", classList: "card-meta", text: v }
            ]
        })

        let card_url_template = (k, v, id) => ({
            ele: 'span', classList: 'url', iden: this.makeUrlId(id), title: 'fetching the status...',
            evnts: {
                mouseover: function () {
                    if (this.data) {
                        let val = this.data;
                        this.title = `${val.message} (refreshed ${Math.max(0, Math.round((Date.now() - val.lastChkTime * 1000) / 1000))}s ago)`
                    }
                }
            },
            children: [
                { ele: 'a', text: k, classList: '$aexternal', attribs: { href: v, target: "_blank" } },
                {
                    ele: 'span', classList: 'urlstatus-refresher', title: 'force refresh status', html: '&#x21BB;',
                    attribs: { urlStatusReqData: { extra: this.makeUrlId(id), url: v, force: 'true' } },
                    evnts: { click: function () { this.fetchStatus([this.urlStatusReqData]) } }
                }
            ]
        })

        let linkBtn = (ico, lnk, styles, title) => ({
            ele: "a", classList: "connect-icon", styles,
            attribs: { href: lnk, innerHTML: `<img alt='${title}' src="./instances-plugin/images/${ico}" style="width: 20px"/>`, title }
        })

        let kvp = (key, value) => ({
            ele: "div", classList: 'kcolonv', children: [
                { ele: "span", classList: "kcolonv-key", text: `${key} : ` },  // we need a space after key
                { ele: "span", classList: "kcolonv-value", text: value }
            ]
        })

        let card = {
            ele: "div", classList: "card", children: [
                {
                    ele: "div", classList: 'details', children: [
                        kvp("Hostname / IP", obj.ipaddr),
                        kvp("Box credentials", `${obj.boxusername} / ${obj.boxpassword}`),
                        kvp("Installation location", obj.installloc),
                        kvp("App credentials", `${obj.appusername} / ${obj.apppassword}`),
                        kvp("Hostname / IP", obj.ipaddr),
                        ...(!obj.meta ? [] : makeExpandable(
                            '<a style="cursor: pointer" title="Other metadata">...</a>',
                            { ele: "table", classList: "card-metadata-container", children: obj.meta.map(u => card_meta_kv(u.key, u.value, 'span')) })
                        ),
                        { ele: "div", styles: { marginTop: '10px' }, children: obj.urls.map((u, idx) => card_url_template(u.tag, u.url, idx)) },
                    ]
                },
                {
                    ele: 'div', classList: "icons", children: [
                        linkBtn('putty.png', `ssh://${obj.boxusername}:${encodeURIComponent(obj.boxpassword)}@${obj.ipaddr}`, undefined, 'SSH'),
                        linkBtn('winscp.jpg', `scp://${obj.boxusername}:${encodeURIComponent(obj.boxpassword)}@${obj.ipaddr}`, undefined, 'SCP'),
                        linkBtn('rdp.png', `ms-rd://full%20address:s:${obj.ipaddr}`, { borderBottom: 'none' }, 'RDP')
                    ]
                }
            ]
        }
        let urlSet = {}
        let x = render('instances', card, (id, ele) => { if (id.startsWith('url:')) urlSet[id] = ele })
        this.fetchStatus(obj.urls, urlSet)
        return x
    }

    getSmallCard(obj) {
        /* filler */
        if (app.loggedIn())
            obj.appusername = obj.appusername.replace('nt_user_id', app.currentUid())
        let urlSet = {}
        let x = render('instances', {
            ele: 'div', classList: 'smallcard', styles: { fontSize: '0.9em' },
            children: [
                {
                    ele: 'div', classList: 'fside',
                    children: [
                        { ele: 'span', title: 'ip address / hostname', html: `&#x1F4BB; ${obj.ipaddr}` },
                        { ele: 'span', title: 'install directory', html: `&#x1F4C1; ${obj.installloc}` },
                    ]
                },
                {
                    ele: 'div', classList: 'fside',
                    children: obj.urls.map((u, idx) => ({ ele: 'a', iden: this.makeUrlId(idx), classList: 'smallurl $aexternal', attribs: { href: u.url, target: '_blank' }, text: u.tag }))
                }
            ]
        }, (id, ele) => { if (id.startsWith('url:')) urlSet[id] = ele })
        this.fetchStatus(obj.urls, urlSet)
        return x
    }

    getTags() {
        console.log(this.getContent())
        return []
    }

    makeUrlId(id) { return `url:${id}` }

    fetchStatus(urls, urlEles) {
        infaUtils.cpost('/testconn', { items: urls.map((u, idx) => ({ url: u.url, extra: this.makeUrlId(idx) })) }).then(x => {
            x.json.items.forEach(val => {
                let uiEle = urlEles[val.extra]
                uiEle.classList.remove('instance-up', 'instance-down')
                uiEle.classList.add(val.message == 'up' ? 'instance-up' : 'instance-down')
                uiEle.data = val
            })
        })
    }

    getCopyContent(doc) {
        let obj = JSON.parse(doc.content)
        return `Hostname: <b>${obj.ipaddr}</b> &nbsp;<br/>
Box credentials : <b>${obj.boxusername} / ${obj.boxpassword}</b><br/>
App credentials : <b>${obj.appusername} / ${obj.apppassword}</b><br/>
Installation location : <b>${obj.installloc}</b><br/>
URLs : ${obj.urls.map(url => `<a href="${url.url}">${url.tag.toLowerCase()}</a>`).join(' &nbsp;|&nbsp; ')}<br/>
<i>(To view more info about this instance in <b>inodes</b> click <a href='${document.location + `/?q=@${doc.id}`}'>here</a></i>)`
    }

}
