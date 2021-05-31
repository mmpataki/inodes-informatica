import json, socket, os, sys, time, random, subprocess, flask, copy, re, requests
from flask import Flask, request, redirect, jsonify, send_from_directory, abort
from flask_cors import CORS
from datetime import datetime
from requests.auth import HTTPBasicAuth
from threading import Thread, RLock
import threading

def timenow():
    return int(time.time() * 1000)

lock = threading.Lock()
work_flows = {}

def updateWfStatus(lmbda, wf, status):
    try:
        lock.acquire()
        if lmbda(wf['state']):
            wf['state']['str'] = status
            wf['state']['endtime'] = timenow()
    except: print('exception while updating wf status')
    finally: lock.release()

def runWf(user, job_id):

    #make a dir for job
    job_dir = './jobs/{}'.format(job_id)
    os.makedirs(job_dir)

    wf = work_flows[user][job_id]
    wf['state'] = {'str': 'running', 'starttime': timenow()}

    runnable = wf['wf']
    taskstatus = wf['state']['taskstatus'] = {}

    def updateStatus(tid, msg):
        if tid not in taskstatus:
            taskstatus[tid] = { 'steps': [], 'starttime': timenow() }
        taskstatus[tid]['steps'].append({'str': msg, 'updatetime': timenow()})
        taskstatus[tid]['status'] = msg
        taskstatus[tid]['lastupdtime'] = timenow()

    failed = False
    for task in runnable['tasks']:

        task_id = task['id']

        upd = lambda x, tid=task_id: updateStatus(tid, x)

        if wf['state']['str'] == 'cancelling' or failed:
            upd('cancelled')
            continue

        #make a dir for task
        upd('making dirs')
        task_dir = '{}/{}'.format(job_dir, task_id)
        os.makedirs(task_dir)

        #write the script
        upd('creating script and log paths')
        script_path = '{}/script.sh'.format(task_dir)
        stdout = '{}/stdout.txt'.format(task_dir)
        stderr = '{}/stderr.txt'.format(task_dir)
        
        with open(script_path, 'w') as fp:
            fp.write(task['script'])
        task['stdout'] = stdout
        task['stderr'] = stderr

        #execute
        upd('running')
        ret = subprocess.call(['bash {} > {} 2> {}'.format(script_path, stdout, stderr)], shell=True)
        upd('completed' if ret == 0 else 'failed')

        if task['inputs']['failWfOnTaskFailure']:
            failed = True
    
    if wf['state']['str'] == 'cancelling':
        updateWfStatus(lambda x: True, wf, 'stopped')
    else:
        updateWfStatus(lambda x: True, wf, 'failed' if failed else 'completed')

@app.route('/wf/<usr>', methods = ['POST'])
def submitwf(usr):
    req = request.get_json()
    for task in req['tasks']: task['id'] = 'task_{}_{}'.format(timenow(), random.randint(0, 10000000))
    if usr not in work_flows:
        work_flows[usr] = {}
    job_id = 'job_{}_{}'.format(timenow(), random.randint(0, 10000000))
    work_flows[usr][job_id] = {'id': job_id, 'wf': req, 'state': { 'str': 'queued'}}
    Thread(target = runWf, args = (usr, job_id)).start()
    return req

@app.route('/wf/<usr>/list', methods = ['GET'])
def listWfs(usr):
    if usr not in work_flows:
        abort(404)
    return jsonify(map(lambda x: {'id': x['id'], 'state': x['state']}, work_flows[usr].values()))

@app.route('/wf/<usr>/<job_id>', methods = ['GET'])
def getWf(usr, job_id):
    if usr not in work_flows:
        abort(404)
    return work_flows[usr][job_id]

@app.route('/wf/joblogs/<path:path>', methods = ['GET'])
def serveLog(path):
    return send_from_directory('.', path, as_attachment=False)

@app.route('/wf/<usr>/<jobid>/stop', methods = ['POST'])
def stopJob(usr, jobid):
    updateWfStatus(lambda x: x != 'completed', work_flows[usr][jobid], 'cancelling')
    return 'stop request sent.'

@app.route('/wf/<usr>/<jobid>/status', methods = ['GET'])
def jobStatus(usr, jobid):
    if usr in work_flows and jobid in work_flows[usr]:
        return work_flows[usr][jobid]['state']
    abort(404)
