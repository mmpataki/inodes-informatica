class infautils {

    getConfig() {
        if (!___infa_config) {
            throw new Error('did you forget to add defn for ___infa_config to www/config.js')
        }
        return ___infa_config;
    }

    get_c_url(url) {
        return `${this.getConfig().companion.url}${url}`
    }

    do_ajax(doauth, f, url, data, hdrs) {
        if (doauth) {
            return new Promise((res, rej) => {
                post('/authtok')
                    .then(resp => JSON.parse(resp.response))
                    .then(tok => ({ ...hdrs, Authtok: `${tok.uid}:${tok.tok}` }))
                    .then(hdrs => f(this.get_c_url(url), data, hdrs).then(resp => res(resp).catch(err => rej(err))))
                    .catch(err => rej(err))
            })
        }
        return f(this.get_c_url(url), data, hdrs)
    }

    cget(url) {
        return this.do_ajax(false, _get, url)
    }

    cpost(url, data, hdrs) {
        return this.do_ajax(false, _post, url, data, hdrs)
    }

    cdelet(url) {
        return this.do_ajax(false, _delet, url)
    }

    cput(url) {
        return this.do_ajax(false, _put, url, data, hdrs)
    }

    cgeta(url) {
        return this.do_ajax(true, _get, url)
    }

    cposta(url, data, hdrs) {
        return this.do_ajax(true, _post, url, data, hdrs)
    }

    cdeleta(url) {
        return this.do_ajax(true, _delet, url)
    }

    cputa(url) {
        return this.do_ajax(true, _put, url, data, hdrs)
    }

    runCommand(scriptText, pnode, callBack, finishCallback) {

        if (!pnode) {
            pnode = document.createElement('div');
        }
        pnode.innerHTML = ''

        let out;
        if (pnode) {
            out = document.createElement('pre');
            out.style = "background-color: #f5f5f5; padding: 10px; color: black; width: 100%; height: 200px; overflow: auto"
            pnode.appendChild(out);
        }

        return new Promise((resolve, reject) => {
            this.cposta('/cli', { script: scriptText }, { 'Content-Type': 'application/json' })
                .then(d => {
                    d = d.response
                    resolve(d)
                    var source = new EventSource(`${this.getConfig().companion.url}/poll?rid=${d}`);
                    source.onmessage = function (event) {
                        if (event.data == 'MPATAKI-STOP_EVENT-SOURCE') {
                            event.target.close()
                            if (finishCallback)
                                finishCallback()
                            return
                        }
                        if (out)
                            out.innerHTML += event.data + "<br/>"
                        if (callBack)
                            callBack(event.data)
                    }
                })
        });
    }

}

let infaUtils = new infautils();