let ______inputTypes = {
    instances: {
        valuepicker: (iSpec, currentValue, inputChanged) => {
            let key = iSpec.name
            return {
                ele: makeSearchAndSelectButton('instance', 'instance', v => inputChanged(key, v), currentValue),
                classList: 'props-ed-input',
                preBuilt: true
            }
        }
    },
    string: {
        valuepicker: (iSpec, currentValue, inputChanged) => {
            let key = iSpec.name
            return {
                ele: 'input',
                classList: 'ed-input',
                styles: { width: 'calc(100% - 24px)' },
                attribs: { value: currentValue || "" },
                evnts: { input: function () { inputChanged(key, this.value) } }
            }
        }
    },
    boolean: {
        valuepicker: (iSpec, currentValue, inputChanged) => {
            let key = iSpec.name
            return {
                ele: 'input',
                classList: 'ed-input',
                attribs: { type: 'checkbox', checked: currentValue || false },
                evnts: { input: function () { inputChanged(key, this.checked) } }
            }
        }
    },
    select: {
        valuepicker: (iSpec, currentValue, inputChanged, otherInputs) => {
            let val = eval(`(${iSpec.type.value})(otherInputs)`), key = iSpec.name

            let ele = render('', {
                ele: 'select',
                classList: `ed-input`,
                styles: { width: 'calc(100% - 12px)' },
                evnts: { change: function () { inputChanged(key, this.value) } }
            })

            Promise.resolve(val).then(vals => {
                if (!vals || vals.length === 0) {
                    vals = []
                    console.error('no values are found from the generator function')
                }
                ele.innerHTML = ''
                vals.forEach(x => {
                    render('', { ele: 'option', text: x, attribs: { value: x } }, () => 0, ele)
                })
                ele.value = currentValue || vals[0]
                inputChanged(key, ele.value)
            })

            return { ele, preBuilt: true }
        },
        renderInputSpecInputter: (ele, currentValue) => {
            ele.innerHTML = ''
            render('automation-i-and-s', {
                ele: 'textarea',
                label: '&#402;: ',
                attribs: { value: currentValue || "() => {\n\treturn [1,2,3]\n}", rows: 4 },
                styles: { display: 'inline-block', 'vertical-align': 'middle', 'margin': '2px 10px 2px 0px', width: '200px' }
            }, 0, ele)
        },
        getExtraInputSpec: (ele) => {
            return { value: ele.querySelector('textarea').value };
        }
    }
}

class ConfigUtil {

    getValuePicker(iSpec, currentValue, inputChanged, otherInputs) {
        let IT = ______inputTypes;
        return IT[iSpec.type.name].valuepicker(iSpec, currentValue, inputChanged, otherInputs)
    }

    renderInputSpecInputter(type, ele, currentValue) {
        let IT = ______inputTypes;
        ele.innerHTML = ''
        IT[type].renderInputSpecInputter && IT[type].renderInputSpecInputter(ele, currentValue)
    }

    getExtraInputSpec(type, ele) {
        let IT = ______inputTypes;
        return IT[type].getExtraInputSpec ? IT[type].getExtraInputSpec(ele) : {}
    }

    getInputTypes() {
        return Object.keys(______inputTypes)
    }

}

let ____configutil = new ConfigUtil()


class automations {

    getCard(obj, doc) {
        return render('automation', {
            ele: 'div',
            classList: 'container',
            children: [
                { ele: 'img', attribs: { src: '/automations-plugin/automations.png' } },
                { ele: 'h3', text: obj.name || "<no name, bug?>", styles: { display: 'inline-block', 'vertical-align': 'super', 'margin-left': '6px' } },
                {
                    ele: 'button', text: 'run', styles: { 'display': 'inline-block', 'vertical-align': 'super', 'margin-left': '10px' }, evnts: {
                        click: () => {
                            app.search(`%applets #wfmanager !designer !${doc.id}`)
                        }
                    }
                },
                { ele: 'span', html: obj.description || "<no description, bug?>", styles: { display: 'block', 'margin-bottom': '10px' } }
            ]
        })
    }

    getSmallCard(obj, doc) {
        return render('automation', {
            ele: 'div',
            classList: 'container', styles: { fontSize: '0.8em', maxWidth: '300px' },
            children: [
                { ele: 'img', attribs: { src: '/automations-plugin/automations.png', style: "height: 20px" } },
                { ele: 'b', text: obj.name || "<no name, bug?>", styles: { 'vertical-align': 'super', 'margin-left': '6px' } },
                { ele: 'span', html: obj.description || "<no description, bug?>", styles: { display: 'block' } }
            ]
        })
    }

    getEditor(obj) {

        class ISummaryStory {
            constructor(obj) { this.obj = obj }
            title() { return "Summary" }
            moral() { return this.obj }
            tell() { return render('summary', { ele: 'pre', styles: { overflow: 'auto' }, text: JSON.stringify(this.obj, undefined, '  ') }) }
        }

        class ScriptIoEditor {
            constructor(obj) { this.obj = obj }
            title() { return "Provide inputs and script" }
            moral() { return { ...(this.obj || {}), script: this.script.ceditor.toString(), inputs: this.getInputSpecs(), postInputTitleTemplate: this.postInputTitleTemplate.value } }
            isCompleted() { return true }
            nextStoryClass() { return ISummaryStory }
            getInputSpecs() {
                let ispecs = this.inputs.querySelectorAll('.automation-i-and-s-input-spec')
                let ret = [], cutil = ____configutil;
                for (let i = 0; i < ispecs.length; i++) {
                    let spec = ispecs[i]
                    let select = spec.querySelector('.automation-i-and-s-input-type')
                    ret.push({
                        name: spec.querySelector('.automation-i-and-s-name').value,
                        dependson: spec.querySelector('.automation-i-and-s-dependson').value,
                        type: { name: select.value, ...(cutil.getExtraInputSpec(select.value, select.nextSibling)) },
                        label: spec.querySelector('.automation-i-and-s-label').value
                    })
                }
                return ret
            }
            tell() {
                let cutil = ____configutil;
                let getInputBuilder = inp => {
                    let bldr = (x) => ({ ele: 'option', text: x, attribs: { value: x } })
                    let types = cutil.getInputTypes()
                    return {
                        ele: 'div', classList: 'input-spec', children: [
                            { ele: 'input', classList: 'name', label: 'name: ', attribs: { value: inp ? inp.name : "" } },
                            { ele: 'input', classList: 'label', label: 'label: ', attribs: { value: inp ? inp.label : "" } },
                            { ele: 'input', classList: 'dependson', label: 'depends on: ', attribs: { value: inp ? inp.dependson || "" : "" } },
                            {
                                ele: 'select', label: 'type: ', classList: 'input-type',
                                children: types.map(bldr),
                                attribs: { value: inp ? inp.type.name : types[0] },
                                evnts: {
                                    change: function () {
                                        cutil.renderInputSpecInputter(this.value, this.nextSibling)
                                    },
                                    rendered: e => inp && cutil.renderInputSpecInputter(inp.type.name, e.nextSibling, inp.type.value)
                                }
                            },
                            { ele: 'div', styles: { display: 'inline-block' } },
                            { ele: 'i', attribs: { title: 'add input', classList: 'fa fa-plus-circle automation-i-and-s-input-spec-remover' }, evnts: { click: function () { this.parentNode.parentNode.insertBefore(render('automation-i-and-s', getInputBuilder()), this.parentNode.nextSibling) } } },
                            { ele: 'i', attribs: { title: 'remove', classList: 'fa fa-minus-circle automation-i-and-s-input-spec-remover' }, evnts: { click: function () { this.parentNode.remove() } } }
                        ]
                    }
                }

                let getInputs = () => {
                    if (!this.obj || !this.obj.inputs || !this.obj.inputs.length) return [getInputBuilder()]
                    return this.obj.inputs.map(input => getInputBuilder(input))
                }

                return render('automation-i-and-s', {
                    ele: 'div',
                    classList: 'container',
                    children: [
                        { ele: 'div', iden: 'inputs', classList: 'inputs', label: 'Inputs : (Specify the inputs this automation expects)', children: getInputs() },
                        {
                            ele: 'div', classList: 'inputs $form-row', children: [
                                { ele: 'input', iden: 'postInputTitleTemplate', label: 'Title template:', attribs: { value: this.obj ? this.obj.postInputTitleTemplate || '' : '' } }
                            ]
                        },
                        { ele: 'div', label: 'Shell script (use above inputs in script as ${input_name})', classList: 'inputs $form-col', children: [makeCodeEditor('script', 'bash', this.obj ? this.obj.script || '' : '', 'escript')] }
                    ]
                }, (id, ele) => this[id] = ele)
            }
        }

        class NameAndDescriptionStory {
            constructor(obj) { this.obj = obj }
            title() { return "Describe this automation unit" }
            type() { return this.autoType.querySelector("input[type='radio']:checked").value }
            moral() { return { ...(this.obj || {}), name: this.name.value, description: this.description.value, type: this.type() } }
            getErrMsg() { return "Fill in all the fields" }
            isCompleted() { return this.name.value && this.name.value.trim() != '' && this.description && this.description.value.trim() != '' }
            nextStoryClass() { return { 'shellscript': ScriptIoEditor }[this.type()] }
            tell() {
                let r = Math.random();
                return render('automation-name-and-desc', {
                    ele: 'div',
                    classList: 'container $form',
                    children: [
                        {
                            ele: 'div', classList: '$form-row', children: [
                                { ele: 'input', iden: 'name', label: 'Name: ', attribs: { value: this.obj ? this.obj.name : "" } }
                            ]
                        },
                        {
                            ele: 'div', classList: '$form-col', children: [
                                { ele: 'textarea', iden: 'description', label: 'Description: ', attribs: { value: this.obj ? this.obj.description : "" } }
                            ]
                        },
                        {
                            ele: 'div', iden: 'autoType', classList: 'types', label: 'Type of automation', children: [
                                { ele: 'input', attribs: { type: 'radio', name: `automation-type-${r}`, value: 'shellscript', checked: this.obj ? this.obj.type == 'shellscript' : false }, postlabel: 'shell script' }
                            ]
                        }
                    ]
                }, (id, ele) => this[id] = ele)
            }
        }

        let ele = render('automation-ed', { ele: 'div' }, (id, obj) => this[id] = obj);
        this.storyBoard = new StoryTeller(ele);
        this.storyBoard.openStory(NameAndDescriptionStory, obj);
        return ele;
    }

    getContent() {
        let story = this.storyBoard.currentStory();
        if (story && story.constructor.name == 'ISummaryStory') {
            return story.moral()
        }
        throw new Error('Please provide all inputs')
    }

}

class workflows {

    getCard(obj, doc) {
        return render('automation', {
            ele: 'div',
            classList: 'container',
            children: [

                { ele: 'img', attribs: { src: '/automations-plugin/workflow.png' } },
                { ele: 'h3', text: obj.name || "<no name, bug?>", styles: { display: 'inline-block', 'vertical-align': 'super', 'margin-left': '6px' } },
                {
                    ele: 'button', text: 'run', styles: { 'display': 'inline-block', 'vertical-align': 'super', 'margin-left': '10px' }, evnts: {
                        click: () => {
                            app.search(`%applets #wfmanager !designer !${doc.id}`)
                        }
                    }
                },
                { ele: 'span', html: obj.description || "<no description, bug?>", styles: { display: 'block', 'margin-bottom': '10px' } }
            ]
        })
    }

    getSmallCard(obj, doc) {
        return render('automation', {
            ele: 'div',
            classList: 'container', styles: { fontSize: '0.8em', maxWidth: '300px' },
            children: [
                { ele: 'img', attribs: { src: '/automations-plugin/workflow.png', style: 'height: 20px; width: 20px' } },
                { ele: 'b', text: obj.name || "<no name, bug?>", styles: { display: 'inline', 'vertical-align': 'super', 'margin-left': '6px' } },
                { ele: 'span', html: obj.description || "<no description, bug?>", styles: { display: 'block' } }
            ]
        })
    }

    getEditor(obj) {

        class ISummaryStory {
            constructor(obj) { this.obj = obj }
            title() { return "Summary" }
            moral() { return this.obj }
            tell() { return render('summary', { ele: 'pre', styles: { overflow: 'auto' }, text: JSON.stringify(this.obj, undefined, '  ') }) }
        }

        class InputEditorStory {
            constructor(obj) { this.obj = obj }
            title() { return "Provide inputs and script" }
            moral() { return { ...(this.obj || {}), inputs: this.getInputSpecs(), type: 'workflow', postInputTitleTemplate: this.postInputTitleTemplate.value, ...this.wfBldr.getDesignWf() } }
            isCompleted() { return true }
            nextStoryClass() { return ISummaryStory }
            getInputSpecs() {
                let ispecs = this.inputs.querySelectorAll('.automation-i-and-s-input-spec')
                let ret = [], cutil = ____configutil;
                for (let i = 0; i < ispecs.length; i++) {
                    let spec = ispecs[i]
                    let select = spec.querySelector('.automation-i-and-s-input-type')
                    ret.push({
                        name: spec.querySelector('.automation-i-and-s-name').value,
                        type: { name: select.value, ...(cutil.getExtraInputSpec(select.value, select.nextSibling)) },
                        label: spec.querySelector('.automation-i-and-s-label').value
                    })
                }
                return ret
            }
            tell() {

                let getWfInputs = () => {
                    return this.getInputSpecs();
                }

                class AutomationInputToWfInputMapperUI {

                    constructor(ele, spec, inputs, inputChangedCb) {
                        this.ele = ele;
                        this.spec = spec;
                        this.inputs = inputs || {};
                        this.inputChangedCb = inputChangedCb;
                    }

                    destroy() {
                        this.ele.innerHTML = ''
                    }

                    initialized() {
                        let spec = this.spec
                        for (let i = 0; i < spec.inputs.length; i++) {
                            const inputName = spec.inputs[i].name;
                            if (!(inputName in this.inputs))
                                return false;
                        }
                        return true;
                    }

                    getValues() {
                        return this.inputs;
                    }

                    showProps() {

                        let obj = this.spec;

                        let extraInputs = {
                            failWfOnTaskFailure: { label: 'Fail workflow on this taks failure', type: { name: 'boolean' }, default: false }
                        };

                        /* add some extra inputs */
                        Object.entries(extraInputs).forEach(arr => {
                            let ei = arr[1]
                            ei.name = arr[0]
                            if (obj.inputs.filter(x => x.name == ei.name).length == 0) {
                                obj.inputs.push(ei)
                                this.inputs[ei.name] = ei.default
                            }
                        })

                        this.ele.innerHTML = ''
                        render('props', {
                            ele: 'div',
                            styles: { 'border-top': 'solid 1px black', 'padding': '10px 20px' },
                            children: [
                                { ele: 'b', text: 'Input mapper', styles: { display: 'block' } },
                                { ele: 'span', text: 'Map the inputs of workflow to inputs of this automation' },
                                { ele: 'div', iden: 'tab' }
                            ]
                        }, (id, ele) => this[id] = ele, this.ele)

                        let inputChanged = (key, value) => {
                            this.inputs[key] = value
                            if (this.inputChangedCb) {
                                try {
                                    this.inputChangedCb(key, value)
                                } catch (e) { /* don't give a damn */ }
                            }
                        }

                        tabulate(obj.inputs, this.tab, {
                            classPrefix: 'wfbldr-props',
                            keys: {
                                'Input property': { vFunc: (iSpec) => iSpec.label || iSpec.name },
                                'Value': {
                                    vFunc: (iSpec) => {
                                        if (iSpec.name in extraInputs) {
                                            return cutil.getValuePicker(iSpec, this.inputs[iSpec.name], inputChanged, obj.inputs)
                                        }
                                        return {
                                            ele: 'select',
                                            evnts: {
                                                change: function () { inputChanged(iSpec.name, this.value) },
                                                rendered: x => inputChanged(iSpec.name, x.value)
                                            },
                                            children: getWfInputs().filter(i => iSpec.type.name == i.type.name).map(i => ({ ele: 'option', text: i.name }))
                                        }
                                    }
                                }
                            }
                        })
                    }
                }

                let cutil = ____configutil;
                let getInputBuilder = (inp) => {
                    let bldr = (x) => ({ ele: 'option', text: x, attribs: { value: x } })
                    let types = cutil.getInputTypes()
                    return {
                        ele: 'div', classList: 'input-spec', children: [
                            { ele: 'input', classList: 'name', label: 'name:', attribs: { value: inp ? inp.name : "" } },
                            { ele: 'input', classList: 'label', label: 'label: ', attribs: { value: inp ? inp.label : "" } },
                            {
                                ele: 'select', label: 'type:', classList: 'input-type', children: types.map(bldr), attribs: { value: inp ? inp.type.name : types[0] }, evnts: {
                                    change: function () { cutil.renderInputSpecInputter(this.value, this.nextSibling) },
                                    rendered: function (e) { if (inp) cutil.renderInputSpecInputter(inp.type.name, e.nextSibling, inp.type.value) }
                                }
                            },
                            { ele: 'div', styles: { display: 'inline-block' } },
                            { ele: 'i', classList: 'input-spec-remover $fa $fa-plus-circle', title: 'add input', evnts: { click: function () { this.parentNode.parentNode.insertBefore(render('automation-i-and-s', getInputBuilder()), this.parentNode.nextSibling) } } },
                            { ele: 'i', classList: 'input-spec-remover $fa $fa-minus-circle', title: 'remove', evnts: { click: function () { this.parentNode.remove() } } }
                        ]
                    }
                }

                let getInputs = () => {
                    if (!this.obj || !this.obj.inputs || !this.obj.inputs.length) return [getInputBuilder()]
                    return this.obj.inputs.map(input => getInputBuilder(input))
                }

                let container = render('automation-i-and-s', {
                    ele: 'div',
                    classList: 'container',
                    children: [
                        { ele: 'div', iden: 'inputs', classList: 'inputs', label: 'Inputs', children: getInputs() },
                        {
                            ele: 'div', classList: '$form-row', children: [
                                { ele: 'input', iden: 'postInputTitleTemplate', label: 'Title template', attribs: { value: this.obj ? this.obj.postInputTitleTemplate || '' : '' } }
                            ]
                        },
                        { ele: 'div', label: 'Workflow', classList: 'wbfbldr', iden: 'container' }
                    ]
                }, (id, ele) => this[id] = ele)

                this.wfBldr = new WorkflowBuilder(this.container, { getPropsManagerClass: () => AutomationInputToWfInputMapperUI }, this.obj.tasks, ['automation'])
                this.wfBldr.templatize = function (e, vs) { return e }
                this.wfBldr.draw();

                return container
            }
        }

        class NameAndDescriptionStory {
            constructor(obj) { this.obj = obj }
            title() { return "Describe this automation unit" }
            moral() { return { ...(this.obj || {}), name: this.name.value, description: this.description.value } }
            getErrMsg() { return "Fill in all the fields" }
            isCompleted() { return this.name.value && this.name.value.trim() != '' && this.description && this.description.value.trim() != '' }
            nextStoryClass() { return InputEditorStory }
            tell() {
                let r = Math.random();
                return render('automation-name-and-desc', {
                    ele: 'div',
                    classList: 'container',
                    children: [
                        {
                            ele: 'div', classList: '$form-row', children: [
                                { ele: 'input', iden: 'name', label: 'Name:', attribs: { value: this.obj ? this.obj.name : "" } }
                            ]
                        },
                        {
                            ele: 'div', classList: '$form-col', children: [
                                { ele: 'textarea', iden: 'description', label: 'Description:', attribs: { value: this.obj ? this.obj.description : "" } }
                            ]
                        }
                    ]
                }, (id, ele) => this[id] = ele)
            }
        }

        let ele = render('automation-ed', { ele: 'div' }, (id, obj) => this[id] = obj);
        this.storyBoard = new StoryTeller(ele);
        this.storyBoard.openStory(NameAndDescriptionStory, obj);
        return ele;
    }

    getContent() {
        let story = this.storyBoard.currentStory();
        if (story && story.constructor.name == 'ISummaryStory') {
            return story.moral()
        }
        throw new Error('Please provide all inputs')
    }

}

class WorkflowBuilder {

    constructor(ele, wfm, tasks, allowedObjectTypes) {
        this.wfm = wfm;
        this.tasks = tasks || []
        this.allowedObjectTypes = allowedObjectTypes
        this.inst = Math.random()

        render('wfbldr', {
            ele: 'div', children: [
                {
                    ele: 'div', children: [
                        { ele: 'span', iden: 'messages' }
                    ]
                },
                {
                    ele: 'div', iden: 'wfEditor', classList: 'wf-editor', children: [
                        {
                            ele: 'div', classList: 'graph-container', children: [
                                { ele: 'div', iden: 'graph', classList: 'graph', styles: { display: 'flex' } }
                            ]
                        },
                        { ele: 'div', classList: 'propseditor', iden: 'propsEle' }
                    ]
                }
            ]
        }, (id, e) => this[id] = e, ele)
        this.draw()
    }

    getTaskItem(task) {
        let self = this;
        return render('wfbldr', {
            ele: 'div',
            classList: 'task-container',
            children: [
                {
                    ele: 'div',
                    classList: 'task-actions',
                    children: [
                        { ele: 'span', attribs: { innerHTML: '&plus;' }, classList: 'tbbtn', evnts: { click: (e) => this.addTask('up', task) } },
                        { ele: 'span', attribs: { innerHTML: '&#9650;' }, classList: 'tbbtn', evnts: { click: (e) => this.moveTask('up', task) } }
                    ]
                },
                {
                    ele: 'div',
                    classList: 'task-and-actions',
                    styles: { display: 'flex', 'align-items': 'center' },
                    children: [
                        {
                            preBuilt: true,
                            ele: makeSearchAndSelectButton(
                                'workflow or an automation task',
                                this.allowedObjectTypes.join('/'),
                                (v) => {
                                    task.spec = v ? v.content : v;
                                    task.doc = v
                                    if (v == undefined) {
                                        if (task.propsManager)
                                            task.propsManager.destroy();
                                        task.propsManager = undefined;
                                    } else {
                                        this.showProps(task)
                                    }
                                },
                                task.doc
                            ),
                            children: [
                                { ele: 'input', classList: 'task-picker', attribs: { type: 'radio', name: `automation-selected-inst-${this.inst}` }, styles: { display: 'none' } }
                            ],
                            evnts: {
                                click: function () {
                                    let last = document.querySelector("div.s-and-s-btn-container.automation-sr-container-selected > input[type=radio]:checked");
                                    if (last) last.parentNode.classList.remove('automation-sr-container-selected');
                                    if (!task.spec) return
                                    let cb = this.querySelector('input.wfbldr-task-picker[type=radio]')
                                    cb.checked = true;
                                    this.classList.add('automation-sr-container-selected')
                                    self.showProps(task);
                                }
                            }
                        },
                        {
                            ele: 'div',
                            classList: 'task-actions',
                            children: [
                                { ele: 'span', attribs: { innerHTML: '&#x2716;', title: 'remove this task' }, classList: 'tbbtn', evnts: { click: () => this.removeTask(task) } }
                            ]
                        }
                    ]
                },
                {
                    ele: 'div',
                    classList: 'task-actions',
                    children: [
                        { ele: 'span', attribs: { innerHTML: '&plus;' }, classList: 'tbbtn', evnts: { click: (e) => this.addTask('down', task) } },
                        { ele: 'span', attribs: { innerHTML: '&#9660;' }, classList: 'tbbtn', evnts: { click: (e) => this.moveTask('down', task) } }
                    ]
                }
            ]
        })
    }

    showProps(task) {
        if (!task.propsManager) {
            let className = this.wfm.getPropsManagerClass();
            task.propsManager = new className(this.propsEle, task.spec, undefined, (key, value) => {
                this.updateTitle(task)
            })
        }
        task.propsManager.showProps()
    }

    updateTitle(task) {
        let elem;
        if (!task || !task.uiElem || !(elem = task.uiElem.querySelector('div.s-and-s-btn-picked-item > div > span'))) return;
        let d = this.getTaskTitle(task);
        if (d) elem.innerHTML = d;
    }

    getTaskTitle(task) {
        if (!task.spec || (!task.propsManager && !task.inputs)) return;
        return task.displayName = this._getTaskTitle(task.spec, { ...task.inputs, ...(task.propsManager ? task.propsManager.getValues() : {}) })
    }

    _getTaskTitle(automation, inputs) {
        if (automation.postInputTitleTemplate && inputs) {
            return this.templatize(automation.postInputTitleTemplate, this.normalizeDocsFromInputs(inputs))
        } else {
            return `<b>${task.spec.name}</b> <i>${task.spec.description}</i>`;
        }
    }

    array_move(arr, old_index, new_index) {
        if (new_index >= arr.length) {
            var k = new_index - arr.length + 1;
            while (k--) {
                arr.push(undefined);
            }
        }
        arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
        return arr; // for testing
    }

    moveTask(direction, task) {
        let index = this.tasks.indexOf(task)
        if (index == -1) return;
        if (direction == 'up' && index != 0)
            this.array_move(this.tasks, index, index - 1)
        else if (direction == 'down' && index != this.tasks.length - 1)
            this.array_move(this.tasks, index, index + 1)
        this.draw()
    }

    addTask(direction, task) {
        let index = this.tasks.indexOf(task)
        if (index == -1) return;
        this.tasks.push(this.newTask());
        if (direction == 'up')
            this.array_move(this.tasks, this.tasks.length - 1, index)
        else if (direction == 'down' && index != this.tasks.length - 2)
            this.array_move(this.tasks, this.tasks.length - 1, index + 1)
        this.draw()
    }

    removeTask(task) {
        const index = this.tasks.indexOf(task);
        if (index > -1) {
            this.tasks.splice(index, 1);
        }
        this.draw()
    }

    newTask() { return { spec: undefined } }

    reset() {
        this.draw();
        this.messages.innerHTML = ''
    }

    getDesignWf() {
        let wf = { tasks: [] };

        for (var i = 0; i < this.tasks.length; i++) {
            let task = this.tasks[i];
            if (!task.propsManager || !task.propsManager.initialized()) {
                this.highLightUninitializedTask(task)
                return
            } else {
                wf.tasks.push({
                    displayName: task.displayName,
                    spec: task.spec,
                    inputs: task.propsManager.getValues()
                })
            }
        }

        return wf;
    }

    getRunnableWf() {
        this.reset()
        let wf = this.getDesignWf();
        return this.resolve(wf)
    }

    templatize(____scr, ____varMap) {
        let str = `
                (
                    function() {
                        ${Object.keys(____varMap).map(key => `let ${key} = ____varMap['${key}']`).join(';\n')}
                        return \`${____scr}\`
                    }
                )()
            `
        try { return eval(str) } catch (e) { return undefined }
    }

    normalizeDocsFromInputs(inputs) {
        let inps = {}
        Object.keys(inputs).forEach(key => {
            let x = inputs[key]
            inps[key] = (typeof x === 'object' && x !== null) ? inputs[key].content : inputs[key]
        })
        return inps;
    }

    resolveTask(task) {
        let resolvers = {
            'shellscript': (task) => {
                return {
                    displayName: task.displayName,
                    spec: task.spec,
                    inputs: task.inputs,
                    script: this.templatize(task.spec.script, this.normalizeDocsFromInputs(task.inputs))
                }
            },
            'workflow': (wftask) => {
                let spec = wftask.spec, inputs = wftask.inputs
                let newTasks = spec.tasks.map(task => {
                    Object.keys(task.inputs).forEach(inputName => {
                        if (task.inputs[inputName] in wftask.inputs) {
                            task.inputs[inputName] = wftask.inputs[task.inputs[inputName]]
                        }
                    })
                    task.displayName = this._getTaskTitle(task.spec, task.inputs)
                    return this.resolveTask(task)
                })
                newTasks[newTasks.length - 1].inputs['failWfOnTaskFailure'] = wftask.inputs['failWfOnTaskFailure']
                return newTasks
            }
        }
        return resolvers[task.spec.type](task)
    }

    resolve(wf) {
        return { tasks: wf.tasks.map(task => this.resolveTask(task)).flat() }
    }

    err(msg) {
        this.messages.innerHTML = `<span style='color: red'>${msg}</span>`
    }

    highLightUninitializedTask(task) {
        task.uiElem.querySelector('.s-and-s-btn-container').classList.add('wfbldr-task-container-uninit')
        this.err('few tasks are uninitialized, initialize/delete them before running')
    }

    draw() {
        if (this.tasks.length == 0)
            this.tasks.push(this.newTask())
        this.graph.innerHTML = ''
        this.tasks.forEach(task => {
            if (!task.uiElem) {
                let taskUIElement = this.getTaskItem(task);
                task.uiElem = taskUIElement;
            }
            render('wfbldr', { ele: task.uiElem, preBuilt: true }, null, this.graph)
            this.updateTitle(task)
        })
    }

    show() { }
    destroy() { }
}

class PropEditor {
    constructor(spec, value, ele, otherInputs, inputChanged) {

        this.draw = function () {
            ele.innerHTML = ''
            render('wfbldr-props', [
                { ele: 'td', styles: { minWidth: '50%' }, children: [{ ele: 'span', text: spec.label || spec.name }] },
                { ele: 'td', styles: { minWidth: '50%' }, children: [____configutil.getValuePicker(spec, value, inputChanged, otherInputs)] }
            ], 0, ele)
        }

        /* notifications for sibling value changes */
        this.notify = function (key, value) {
            if (spec.dependson && spec.dependson.split(',').includes(key)) {
                this.draw()
            }
        }

        this.draw()

    }

}

class PropsManager {

    constructor(ele, spec, inputs, inputChangedCb) {
        this.ele = ele
        this.spec = spec
        this.inputs = inputs || {}
        this.inputChangedCb = inputChangedCb
    }

    destroy() {
        this.ele.innerHTML = ''
    }

    initialized() {
        let spec = this.spec
        for (let i = 0; i < spec.inputs.length; i++) {
            const inputName = spec.inputs[i].name
            if (!(inputName in this.inputs))
                return false
        }
        return true;
    }

    getValues() {
        return this.inputs;
    }

    showProps() {

        let obj = this.spec;

        let extraInputs = [
            { name: 'failWfOnTaskFailure', label: 'Fail workflow on this taks failure', type: { name: 'boolean' }, default: false }
        ];

        /* add some extra inputs */
        extraInputs.forEach(ei => {
            if (obj.inputs.filter(x => x.name == ei.name).length == 0) {
                obj.inputs.push(ei)
                if (!(ei.name in this.inputs))
                    this.inputs[ei.name] = ei.default
            }
        })

        this.ele.innerHTML = ''
        render('props', {
            ele: 'div',
            styles: { 'border-top': 'solid 1px black', 'padding': '10px 20px' },
            children: [
                { ele: 'b', text: 'Properties' },
                { ele: 'div', iden: 'tab' }
            ]
        }, (id, ele) => this[id] = ele, this.ele)

        this.propsEditors = []

        let inputChanged = (key, value) => {
            this.inputs[key] = value
            if (this.inputChangedCb) {
                try {
                    this.inputChangedCb(key, value)
                    this.propsEditors.forEach(pe => pe.notify(key, value))
                } catch (e) { /* don't give a damn */ }
            }
        }

        render('prop-mgr', {
            ele: 'table', styles: { width: '100%', 'table-layout': 'fixed' },
            children: obj.inputs.map(input => ({
                ele: 'tr', evnts: {
                    rendered: ele => {
                        this.propsEditors.push(new PropEditor(input, this.inputs[input.name], ele, this.inputs, inputChanged))
                    }
                }
            }))
        }, 0, this.tab)
    }
}

class JobsUI {

    constructor(container, wfm) {

        this.wfm = wfm

        render('jobs-ui', {
            ele: 'div', iden: 'jobsView', classList: 'jobs-view', children: [
                {
                    ele: 'div', classList: 'actions', children: [
                        { ele: 'button', attribs: { innerHTML: '&#x27f2;' }, evnts: { click: () => this.refresh() } }
                    ]
                },
                {
                    ele: 'div', iden: 'jobsTable', classList: 'table', children: []
                }
            ]
        }, (id, ele) => this[id] = ele, container)

    }

    show() {
        this.refresh()
    }

    refresh() {
        infaUtils.cget(`/wf/${getCurrentUser()}/list`)
            .then(data => JSON.parse(data.response))
            .then(jobs => {
                this.jobsTable.innerHTML = ''
                tabulate(jobs, this.jobsTable, {
                    defaultSortKey: 'Start time',
                    keys: {
                        Jobs: {
                            keyId: 'id', sortable: true,
                            vFunc: (x) => {
                                return { ele: 'a', text: x.id, attribs: { href: '#' }, evnts: { click: () => this.wfm.openJob(x.id) } }
                            }
                        },
                        State: {
                            vFunc: (x) => ({
                                ele: 'span',
                                text: x.state.str,
                                children: (x.state.str != 'running' ? [] : [{ ele: 'img', attribs: { src: '/wait.gif' }, styles: { 'vertical-align': 'middle', 'margin-left': '5px' } }])
                            }),
                            kFunc: (x) => x.state.str,
                            sortable: true
                        },
                        'Start time': { vFunc: (x) => new Date(x.state.starttime).toLocaleString(), kFunc: (x) => x.state.starttime, sortable: true },
                        'End time': { vFunc: (x) => x.state.endtime ? new Date(x.state.endtime).toLocaleString() : '--/--/----', kFunc: (x) => x.state.endtime, sortable: true },
                        '': {
                            vFunc: (x) => {
                                return {
                                    ele: 'div', children: (x.state.str != 'running' ? [] : [{ ele: 'a', attribs: { href: '#' }, text: 'stop', evnts: { click: () => this.wfm.stopJob(x.id) } }])
                                }
                            }
                        }
                    }
                })
            }).catch((e) => {
                console.log(e);
                this.jobsTable.innerHTML = `No jobs found. Try [re]-logging in`
            })

        if (!this.refreshTaskId) {
            this.refreshTaskId = setInterval(() => this.refresh(), 5000)
        }
    }

    destroy() {
        if (this.refreshTaskId) {
            clearInterval(this.refreshTaskId)
            this.refreshTaskId = undefined
        }
    }
}

class JobViewer {
    constructor(element, wfm) {
        this.wfm = wfm;
        this.container = element;
        element.innerHTML = 'Pick a job from Jobs panel to view it here'
    }

    show(job_id) {

        infaUtils.cget(`/wf/${getCurrentUser()}/${job_id}`)
            .then(r => r.json).then(job => {
                this.container.innerHTML = ''
                render('view-job', {
                    ele: 'div',
                    styles: { position: 'relative' },
                    children: [
                        { ele: 'div', iden: 'titleContainer' },
                        {
                            ele: 'div', children: [
                                { ele: 'div', classList: 'graph', iden: 'graphContainer' },
                                { ele: 'div', classList: 'props', iden: 'props' },
                                { ele: 'div', classList: 'steps', iden: 'steps' },
                                {
                                    ele: 'div', classList: 'log-container', iden: 'logs', children: [
                                        { ele: 'h3', classList: 'logtitle', iden: 'logtitle' },
                                        { ele: 'pre', classList: 'logs', iden: 'logcontent' }
                                    ]
                                }
                            ]
                        }
                    ]
                }, (id, ele) => this[id] = ele, this.container)

                this.job = job;
                this._show(job, job.state)
            })

        if (!this.refreshTaskId) {
            this.refreshTaskId = setInterval(() => {
                infaUtils.cget(`/wf/${getCurrentUser()}/${job_id}/status`)
                    .then(r => r.json).then(state => this._show(this.job, state))
            }, 5000)
        }
    }

    _show(job, statusOb) {
        let loadLog = (url) => {
            infaUtils.cget(url).then(r => this.logcontent.innerText = r.response)
            switchPanel('logs')
            this.logtitle.innerText = url.substring(7)
        }

        let showSteps = (tname, steps) => {
            this.steps.innerHTML = ''
            render('view-job', {
                ele: 'div',
                children: [
                    { ele: 'h3', html: `Steps of task [${tname}]` },
                    {
                        ele: 'div', classList: `task-steps`,
                        children: steps.map(step => {
                            return {
                                ele: 'div', children: [
                                    { ele: 'span', classList: 'task-step-time', text: (new Date(step.updatetime).toLocaleString()) },
                                    { ele: 'span', classList: 'task-step-name', text: step.str },
                                ]
                            }
                        })
                    }
                ]
            }, () => 0, this.steps)
            switchPanel('steps')
        }

        let switchPanel = (p) => {
            ['steps', 'props', 'logs'].forEach(x => this[x].style.display = 'none')
            this[p].style.display = 'block'
        }

        let getTasksUIs = (job, statusObj) => {
            return job.wf.tasks.map(task => {
                let tstatus = statusObj.taskstatus[task.id]
                let status = tstatus ? tstatus.status : 'queued'
                return {
                    ele: 'div',
                    classList: 'task-container-parent',
                    children: [
                        {
                            ele: 'div',
                            classList: `task-container ${status}`,
                            children: [
                                { ele: 'span', classList: 'task-name', html: task.displayName },
                                {
                                    ele: 'div',
                                    children: [
                                        ...(!tstatus ? [] : [
                                            {
                                                ele: 'b', classList: 'task-status', text: status,
                                                children: (status != 'running' ? [] : [{ ele: 'img', attribs: { src: '/wait.gif' }, styles: { 'vertical-align': 'middle', 'margin-left': '5px' } }])
                                            },
                                            { ele: 'a', attribs: { href: '#' }, classList: 'log-links', text: 'details', evnts: { click: (e) => { e.stopPropagation(); showSteps(task.displayName, tstatus.steps) } } },
                                            { ele: 'a', attribs: { href: '#' }, classList: 'log-links', text: 'stdout', evnts: { click: (e) => { e.stopPropagation(); loadLog(tstatus.stdout) } } },
                                            { ele: 'a', attribs: { href: '#' }, classList: 'log-links', text: 'stderr', evnts: { click: (e) => { e.stopPropagation(); loadLog(tstatus.stderr) } } },
                                            { ele: 'a', attribs: { href: '#' }, classList: 'log-links', text: 'script', evnts: { click: (e) => { e.stopPropagation(); loadLog(tstatus.script) } } },
                                        ])
                                    ]
                                }
                            ],
                            evnts: {
                                click: (e) => {
                                    new PropsManager(this.props, task.spec, task.inputs).showProps()
                                    switchPanel('props')
                                }
                            }
                        }
                    ]
                }
            })
        }

        this.titleContainer.innerHTML = ''
        this.graphContainer.innerHTML = ''

        render('view-job', {
            ele: 'div', styles: { padding: '20px' }, children: [
                { ele: 'h4', text: job.id, styles: { 'display': 'inline-block', 'margin-right': '10px' } },
                { ele: 'span', text: statusOb.str },
                {
                    ele: 'div', classList: 'actions', children: [
                        { ele: 'button', attribs: { innerHTML: '&#x25A0;', disabled: statusOb.str != 'running' }, text: 'stop', evnts: { click: () => this.wfm.stopJob(job.id) } }
                    ]
                },
            ]
        }, (id, ele) => this[id] = ele, this.titleContainer)

        render('view-job', { ele: 'div', classList: 'graph', children: getTasksUIs(job, statusOb) }, (id, ele) => this[id] = ele, this.graphContainer)
    }

    destroy() {
        if (this.refreshTaskId) clearInterval(this.refreshTaskId)
        this.refreshTaskId = undefined
    }
}

class WfManager {

    /**
     * 
     * @param {*} container : where to render this UI
     * @param {*} action : what to open can be one of {designer, jobs}
     * @param {*} input : if action = designer => list of task object else a jobid
     */
    constructor(container, action, input) {

        let tasks, jobid
        if (action === 'designer')
            tasks = input
        else if (action === 'viewjob')
            jobid = input

        this.WF_BUILDER = 'Workflow Builder'
        this.JOBS_UI = 'Jobs'
        this.JOB_VIEWER = 'View job'

        let inst = Math.random()

        render('wfmanager', {
            ele: 'div', children: [
                { ele: 'h3', text: 'Workflow manager' },
                {
                    ele: 'div', classList: 'panel-title-bar', children: [
                        { ele: 'input', attribs: { type: 'radio', name: `tab-chooser-${inst}`, checked: true }, classList: 'panel-switcher-btn', postlabel: this.WF_BUILDER, evnts: { click: () => this.switchPanel(this.WF_BUILDER) } },
                        { ele: 'input', attribs: { type: 'radio', name: `tab-chooser-${inst}` }, classList: 'panel-switcher-btn', postlabel: this.JOBS_UI, evnts: { click: () => this.switchPanel(this.JOBS_UI) } },
                        { ele: 'input', attribs: { type: 'radio', name: `tab-chooser-${inst}` }, classList: 'panel-switcher-btn', postlabel: this.JOB_VIEWER, evnts: { click: () => this.switchPanel(this.JOB_VIEWER) } }
                    ]
                },
                {
                    ele: 'div', iden: 'contentPanel', children: [
                        {
                            ele: 'div', iden: this.WF_BUILDER, styles: { position: 'relative' }, children: [
                                {
                                    ele: 'div', classList: 'actions-panel', children: [
                                        { ele: 'button', classList: 'wf-action wf-action-run', attribs: { innerHTML: '&#x25B6;', title: 'Run' }, evnts: { click: () => this.runWf() } }
                                    ]
                                }
                            ]
                        },
                        { ele: 'div', classList: 'jobs-ui', iden: this.JOBS_UI },
                        { ele: 'div', classList: 'view-job', iden: this.JOB_VIEWER, text: 'Pick a job from Jobs panel to view it here' },
                    ]
                }
            ]
        }, (id, ele) => this[id] = ele, container)
        this.objs = {}
        this.objs[this.WF_BUILDER] = this.wfBuilder = new WorkflowBuilder(this[this.WF_BUILDER], this, tasks, ['automation', 'workflow'])
        this.objs[this.JOBS_UI] = this.jobsUI = new JobsUI(this[this.JOBS_UI], this)
        this.objs[this.JOB_VIEWER] = this.jobViewer = new JobViewer(this[this.JOB_VIEWER], this)

        if (action == 'viewjob')
            this.openJob(jobid)
        else
            this.switchPanel(this.WF_BUILDER)
    }

    runWf() {
        let runnableWf = this.wfBuilder.getRunnableWf()
        console.log(runnableWf)
        infaUtils.cposta(`/wf`, runnableWf, { 'Content-Type': 'application/json' }).then(() => this.listJobs())
    }

    openJob(job_id) {
        this.switchPanel(this.JOB_VIEWER, job_id)
    }

    listJobs() {
        this.switchPanel(this.JOBS_UI)
    }

    stopJob(job_id) {
        infaUtils.cpost(`/wf/${getCurrentUser()}/${job_id}/stop`).then(() => showSuccess('Stop request sent'))
    }

    getPropsManagerClass() { return PropsManager; }

    switchPanel(pName, arg) {
        [this.WF_BUILDER, this.JOBS_UI, this.JOB_VIEWER].filter(x => x != pName).forEach(p => { this[p].style.display = 'none'; this.objs[p].destroy() })
        this.objs[pName].show(arg)
        this[pName].style.display = 'block'
    }
}
