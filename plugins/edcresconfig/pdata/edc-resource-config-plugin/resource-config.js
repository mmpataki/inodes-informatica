class edcresconfig {
    constructor() {
        this.elems = {}
    }
    getCard(obj, obj1) {
        let ele = render('edcresconfig', { ele: 'div' })
        ele.appendChild(new SummaryStory(obj).tell())
        ele.appendChild(render('', { ele: 'button', text: 'Deploy', evnts: { click: () => app.search(`#edc #resourcedeployer !${obj1.id}`) } }))
        return ele;
    }

    getEditor(obj) {
        let ele = render('edcresconfig', { ele: 'div' });
        this.storyTeller = new StoryTeller(ele);
        let storyClass = obj ? SummaryStory : EDCResTypeSelectionStory;
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

    getTags() {
        let obj = this.getContent()
        return [obj.version, obj.resourceName, obj.resourceType]
    }
}

function EDCResTypeSelectionStory(args) {

    this.title = () => 'Pick a input type'

    this.tell = function () {
        this.ele = render('inp-type-select', {
            ele: 'div',
            children: [
                {
                    ele: 'input',
                    classList: 'input-full-bkp',
                    postlabel: 'Import from a instance',
                    lblClass: 'label-full-bkp',
                    attribs: {
                        type: 'radio',
                        name: 'backup-type',
                        value: 'from-instance',
                        checked: true
                    }
                },
                { ele: 'br' },
                {
                    ele: 'input',
                    classList: 'input-res-config',
                    postlabel: 'Manually enter the resource location',
                    lblClass: 'label-res-config',
                    attribs: {
                        type: 'radio',
                        name: 'backup-type',
                        value: 'manual-config'
                    }
                },
                { ele: 'br' },
                {
                    ele: 'input',
                    classList: 'input-upload-xdoc',
                    postlabel: 'Upload Xdocs',
                    lblClass: 'label-upload-xdocs',
                    attribs: {
                        type: 'radio',
                        name: 'backup-type',
                        value: 'upload-xdocs'
                    }
                }
            ]
        })
        return this.ele;
    }

    this.nextStoryClass = function () {
        let funcs = { 'from-instance': InstanceSelectionStory, 'manual-config': ManualConfigStory, 'upload-xdocs': UploadXdocStory }
        return funcs[this.ele.querySelector("input[type='radio']:checked").value]
    }

    this.moral = () => ({ option: this.ele.querySelector("input[type='radio']:checked").value })

    this.isCompleted = function () {
        return true
    }
}

class InstanceSelectionStory {
    constructor(args) {

        this.uniqid = Math.random()

        this.title = () => 'Pick an instance'

        this.tell = () => {
            let self = this
            return render('instance-selection-story', {
                ele: 'div',
                classList: 'inputs-full-bkp',
                children: [
                    {
                        ele: 'input',
                        label: 'search for instances',
                        classList: 'input',
                        evnts: {
                            input: function (e) {
                                self.listInstances(this.value, this.nextSibling)
                            }
                        }
                    },
                    {
                        ele: 'div',
                        classList: 'results',
                        iden: 'results'
                    }
                ]
            }, (id, ele) => this[id] = ele)
        }

        this.isCompleted = () => {
            return this.connDetail && 1
        }

        this.getErrMsg = () => {
            return 'Select a instance'
        }

        this.nextStoryClass = () => ResourceSelectionStory

        this.moral = () => ({ ...args, connDetail: this.connDetail })

        this.inst_template = (item) => {
            let self = this
            let inst = JSON.parse(item.content)
            let u = new URL(inst.urls.filter(url => url.tag.toLowerCase().includes("ldm") || url.tag.toLowerCase().includes("catalog"))[0].url)
            let url = u.protocol + "//" + u.host
            return {
                ele: 'div',
                classList: 'container',
                children: [
                    { ele: 'input', iden: 'chkbox', attribs: { type: 'radio', name: `instance-${this.uniqid}` } },

                    { ele: 'span', text: 'Owner', classList: 'key' },
                    { ele: 'span', text: item.owner, classList: 'value' },
                    { ele: 'br' },

                    { ele: 'span', text: 'IP address', classList: 'key' },
                    { ele: 'span', text: inst.ipaddr, classList: 'value' },
                    { ele: 'br' },

                    { ele: 'span', text: 'Installation location', classList: 'key' },
                    { ele: 'span', text: inst.installloc, classList: 'value' },
                    { ele: 'br' },

                    { ele: 'span', text: 'url', classList: 'key' },
                    { ele: 'a', text: url, classList: 'value', attribs: { href: url, target: "_blank" } },
                    { ele: 'br' },

                    {
                        ele: 'div',
                        classList: 'tags',
                        style: {
                            padding: '10px'
                        },
                        attribs: {
                            innerHTML: item.tags.map(t => `<span class="inst-searchresult-tag">${t}</span>`).join(' ')
                        }
                    }
                ],
                evnts: {
                    click: function () {
                        self.connDetail = { url: url, username: inst.appusername, password: inst.apppassword }
                        let chkbox = this.querySelector('input[type="radio"]')
                        chkbox.checked = !chkbox.checked
                    }
                }
            }
        }

        this.listInstances = (q, where) => {
            inodes.search(`%instances #edc ${q}`)
                .then(resp => JSON.parse(resp.response))
                .then(res => {
                    where.innerHTML = ""
                    res.results.forEach(item => {
                        let templ = this.inst_template(item)
                        if (templ) {
                            render('inst-search-result', templ, x => 1, where)
                        }
                    })
                })
        }
    }
}

class ResourceSelectionStory {
    constructor(args) {
        let uniqId = Math.random()
        this.title = () => 'Pick a resource'
        this.tell = () => {
            let ele = render('resource-search-result', { ele: 'div' })
            this.listResources(args.connDetail, ele)
            return ele
        }

        this.nextStoryClass = () => ResourceConfigStory

        this.moral = () => ({ ...args, resourceName: this.resourceName, resourceType: this.resourceType, version: this.version, description: this.description })

        this.isCompleted = () => (this.resourceName && 1)

        this.getErrMsg = () => "Pick a resource to continue.."

        this.listResources = (c, where) => {
            console.log(c)
            let self = this
            callWithWaitUI(where, (done) => {
                let headers = { Authorization: "Basic " + btoa(`${c.username}:${c.password}`) }
                let getRConf = ncors_get(`${c.url}/access/1/catalog/resources`, undefined, headers)
                let getVersion = ncors_get(`${c.url}/access/2/catalog/data/productInformation`, undefined, headers)
                Promise.allSettled([getRConf, getVersion])
                    .then(proms => {
                        let resources = JSON.parse(proms[0].value.response)
                        let version = JSON.parse(proms[1].value.response).releaseVersion
                        where.innerHTML = ""
                        tabulate(resources, where, {
                            classPrefix: 'res-search-result',
                            defaultSortKey: 'Name',
                            keys: {
                                "Select": { vFunc: (r) => { return { ele: 'input', attribs: { type: 'radio', name: `resource-${uniqId}`, resourceName: r.resourceName, resourceType: r.resourceTypeName, description: r.description }, evnts: { change: (e) => e.stopPropagation() } } } },
                                "Name": { sortable: true, keyId: "resourceName" },
                                "Type": { sortable: true, keyId: "resourceTypeName" },
                                "Created By": { keyId: "createdBy" },
                                "Description": { keyId: "description" }
                            },
                            rowEvents: {
                                click: function () {
                                    let chkbox = this.querySelector('input[type=radio]')
                                    self.resourceName = chkbox.resourceName
                                    self.resourceType = chkbox.resourceType
                                    self.description = chkbox.description
                                    self.version = version
                                    chkbox.checked = !chkbox.checked
                                }
                            }
                        })
                    })
                    .finally(() => done())
            })
        }
    }
}

class ResourceConfigStory {
    constructor(args) {

        let resourceConfig

        this.title = () => 'Pick what you want to backup'

        this.nextStoryClass = () => SummaryStory

        this.moral = () => ({ ...args, resourceConfig: this.resourceConfig, providerIds: this.providerIds })

        this.isCompleted = () => true

        this.getErrMsg = () => ""

        this.preDestroy = () => {
            if (this.saveResourceConfig.checked)
                this.resourceConfig = resourceConfig
            this.providerIds = []
            return new Promise((resolve) => {
                callWithWaitUI(this.resconfig, (done, updateText) => {
                    let scannerIdElems = this.scannerIds.querySelectorAll('input[type=checkbox]:checked')
                    let c = args.connDetail, scannerIds = this.providerIds
                    for (let i = 0; i < scannerIdElems.length; i++) {
                        scannerIds.push(scannerIdElems[i].data)
                    }
                    scannerIds.push("enrichment")
                    scannerIds.push("args.resourceName")
                    if (scannerIds.length < 1) { resolve(); done(); return };
                    this.toggleBtn.style.display = "block"
                    updateText('Backing up the xdocs')
                    infaUtils.runCommand(
                        `bash $BIN_DIR/edc/resbackuprestore.sh backup "${c.url}" "${c.username}" "${c.password}" "${args.version}" "${args.resourceName}" "$ATTACH_DIR/${getCurrentUser()}/" ${scannerIds.map(sc => "\"" + sc + "\"").join(" ")}`,
                        this.runcmdout,
                        (s) => 0,  // data callback
                        () => { resolve(); done(); }
                    ).catch(() => done());
                })
            })
        }

        this.tell = () => {
            this.ele = render('resource-config', {
                ele: 'div', children: [
                    { ele: 'div', iden: 'resconfig' },
                    { ele: 'u', text: 'toggle console logs', iden: 'toggleBtn', attribs: { style: 'cursor:pointer; display:none; margin-top:20px' }, evnts: { click: function () { let t = this.nextSibling.style; t.display = t.display == 'none' ? 'block' : 'none' } } },
                    { ele: 'div', iden: 'runcmdout', attribs: { style: 'display: none' } }
                ]
            }, (id, ele) => this[id] = ele)
            this.loadResourceConfig(this.resconfig)
            return this.ele
        }

        this.loadResourceConfig = (ele) => {
            let c = args.connDetail
            ncors_get(`${c.url}/access/1/catalog/resources/${args.resourceName}?sensitiveOptions=true`, undefined,
                { Authorization: "Basic " + btoa(`${c.username}:${c.password}`) })
                .then(x => x.json).then(res => {
                    resourceConfig = res
                    let hres = res.resourceIdentifier
                    return render(
                        'resource-import-detail',
                        {
                            ele: 'div',
                            classList: 'container',
                            children: [
                                { ele: 'i', classList: 'key', text: 'Resource name' },
                                { ele: 'b', classList: 'value', text: hres.resourceName },
                                { ele: 'br' },
                                { ele: 'i', classList: 'key', text: 'Type' },
                                { ele: 'b', classList: 'value', text: hres.resourceTypeName },
                                { ele: 'br' },
                                {
                                    ele: 'div',
                                    classList: 'features',
                                    children: [
                                        { ele: 'span', text: 'Choose the features you want to backup' },
                                        { ele: 'br' },
                                        {
                                            ele: 'input',
                                            postlabel: 'Resource config',
                                            classList: 'features',
                                            iden: 'saveResourceConfig',
                                            attribs: {
                                                type: 'checkbox',
                                                checked: true
                                            }
                                        },
                                        { ele: 'br' },
                                        {
                                            ele: 'input',
                                            classList: 'pick-xdocs features',
                                            postlabel: 'Exchange documents (xdocs)',
                                            attribs: {
                                                type: 'checkbox'
                                            }
                                        },
                                        {
                                            ele: 'div',
                                            classList: 'scannerids',
                                            iden: 'scannerIds',
                                            text: 'Choose all the type of xdocs you want to save',
                                            children: res.scannerConfigurations.filter(x => x.enabled || x.scanner.providerTypeId == 'CORE').map(x => {
                                                return {
                                                    ele: 'div',
                                                    classList: 'scannerid',
                                                    children: [
                                                        {
                                                            ele: 'input',
                                                            attribs: { type: 'checkbox', disabled: x.scanner.providerTypeId == 'CORE', checked: x.scanner.providerTypeId == 'CORE', data: x.scanner.scannerId },
                                                            postlabel: x.scanner.scannerId
                                                        }
                                                    ]
                                                }
                                            })
                                        }
                                    ]
                                }
                            ]
                        },
                        (id, ele) => this[id] = ele,
                        ele
                    )
                })
        }
    }
}

class ManualConfigStory {
    constructor(args) {

        this.title = () => 'Enter the resource coordinates..'

        this.tell = function () {
            return render('instance-selection-story', {
                ele: 'div',
                classList: 'inputs-res-config',
                children: [
                    {
                        ele: "div",
                        children: [
                            { ele: "input", classList: "input", iden: "url", label: "edc url" },
                            { ele: "input", classList: "input", iden: "user", label: "username" },
                            { ele: "input", classList: "input", iden: "password", label: "password" }
                        ]
                    }
                ]
            }, (id, ele) => this[id] = ele)
        }

        this.isCompleted = () => (this.url.value && this.user.value && this.password.value)

        this.nextStoryClass = () => ResourceSelectionStory

        this.moral = () => {
            let u = new URL(this.url.value)
            return { connDetail: { url: `${u.protocol}//${u.host}`, username: this.user.value, password: this.password.value } }
        }
    }
}

class UploadXdocStory {
    constructor(args) {
        this.title = () => 'Upload xdocs'
        this.tell = function () {
            return render('xdocs-upload-story', {
                ele: 'div',
                classList: 'container',
                children: [
                    {
                        ele: "select",
                        classList: "inp",
                        iden: "version",
                        label: 'EDC version',
                        children: [
                            { ele: "option", value: "10.2.1", text: "10.2.1" },
                            { ele: "option", value: "10.2.1", text: "10.2.2" },
                            { ele: "option", value: "10.2.1", text: "10.2.2 HF1" },
                            { ele: "option", value: "10.2.1", text: "10.4.0" },
                            { ele: "option", value: "10.2.1", text: "10.4.1" },
                            { ele: "option", value: "10.2.1", text: "10.5.0" },
                        ]
                    },
                    {
                        ele: 'button',
                        classList: 'inp',
                        text: 'Pick xdoc json files',
                        label: 'Upload xdocs',
                        evnts: {
                            click: () => {
                                filePicker().then((files) => {
                                    this.files = files
                                    this.filePath.innerHTML = files.map(file => `<a href="${files[0]}">${files[0]}</a>`).join('<br/>')
                                })
                            }
                        }
                    },
                    { ele: 'div', classList: 'file-path', iden: 'filePath' }
                ]
            }, (id, ele) => this[id] = ele)
        }
        this.nextStoryClass = () => SummaryStory
        this.moral = () => ({ ...args, version: this.version.value, xdocs: this.files.map(f => ({ file: f })) })

        this.isCompleted = function () {
            return (this.files && this.version.value)
        }
        this.getErrMsg = function () {
            return 'Choose a file and version'
        }
    }
}

class SummaryStory {
    constructor(arg) {
        this.title = () => 'Summary'

        this.tell = () => {
            console.log(arg)
            return render('summary-story', {
                ele: 'div',
                attribs: { style: 'margin: 10px 0px;' },
                children: [
                    ...(!arg.resourceName ? [] : [{ ele: 'span', classList: 'kvp', attribs: { innerHTML: `<i>Resource name</i>: <b>${arg.resourceName}</b>` } }]),
                    ...(!arg.resourceType ? [] : [{ ele: 'span', classList: 'kvp', attribs: { innerHTML: `<i>Resource type</i>: <b>${arg.resourceType}</b>` } }]),
                    ...(!arg.description ? [] : [{ ele: 'span', classList: 'kvp', attribs: { innerHTML: `<i>Description</i>: <b>${arg.description}</b>` } }]),
                    ...(!arg.version ? [] : [{ ele: 'span', attribs: { innerHTML: `<i>EDC version</i>: <b>${arg.version}</b>` } }]),
                    ...(!arg.xdocs ? [] : [{
                        ele: 'div',
                        children: [
                            { ele: 'span', text: 'XDoc files' },
                            ...arg.xdocs.map(xdoc => ({ ele: 'a', attribs: { href: xdoc.file }, text: xdoc.file, classList: 'xdoc-link' }))
                        ]
                    }]),
                    ...(!arg.resourceConfig ? [] : [{
                        ele: 'div',
                        children: [
                            { ele: 'span', text: 'Config' },
                            {
                                ele: 'div',
                                classList: 'scanner-config',
                                children: arg.resourceConfig.scannerConfigurations.filter(sc => sc.enabled).map(sc => ({
                                    ele: 'div',
                                    children: [
                                        { ele: 'a', attribs: { href: '#' }, text: sc.scanner.scannerId, evnts: { click: function () { this.nextSibling.style.display = this.nextSibling.style.display == 'block' ? 'none' : 'block' } } },
                                        {
                                            ele: 'div',
                                            classList: 'scanner-config-options',
                                            children: sc.configOptions.map(co => ({ ele: 'span', classList: 'scanner-config-option', attribs: { innerHTML: `<i>${co.optionId}</i>: <b>${JSON.stringify(co.optionValues)}</b>` } }))
                                        }
                                    ]
                                }))
                            }
                        ]
                    }])
                ]
            })
        }
        this.moral = () => { return arg }
    }
}