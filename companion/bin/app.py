import json, socket, os, sys, time, random, subprocess, flask, copy, re, requests
from requests import auth
from urlparse import urlparse
from flask import Flask, request, redirect, jsonify, send_from_directory, abort
from gevent.select import select
from flask_cors import CORS
from datetime import datetime
from requests.auth import HTTPBasicAuth
from threading import Thread, RLock
import threading

app = flask.Flask(__name__)
CORS(app)

inodesurl = os.environ['INODES_URL']

def authenticate(req):
	usr, tok = req.headers['Authtok'].split(':')
	resp = requests.get('{}/authtok/verify?usr={}&tok={}'.format(inodesurl, usr, tok)).raw
	print(resp)
	return usr

reqs = {}
procs = {}

@app.route('/cli', methods=['POST'])
def cli():
	usr = authenticate(request)
	i =  '{}_{}'.format(random.random(), time.time())
	reqs[i] = {'script': request.get_json()['script'], 'user': usr}
	return i

@app.route('/passin', methods=['POST'])
def passin():
	rid=request.args['rid']
	inp = request.get_json()['input']
	if rid in procs:
		procs[rid].stdin.write(inp)
	return 'done'

@app.route('/poll')
def start_proc():
	def inner(rid):
		if rid not in reqs:
			yield 'data: MPATAKI-STOP_EVENT-SOURCE\n\n'
			return
		user = reqs[rid]['user']
		fdir='{}/{}/{}'.format(os.environ['EXEC_DIR'], user, rid)
		f = '{}/script'.format(fdir)
		os.mkdir(fdir)
		fp=open(f, 'w')
		fp.write(reqs[rid]['script'])
		fp.close()
		reqs.pop(rid)
		proc = subprocess.Popen(
				['bash secure_execute.sh {} {} script'.format(user, fdir)],
				shell=True,
				stdout=subprocess.PIPE,
				stderr=subprocess.PIPE,
				stdin=subprocess.PIPE
			)
		procs[rid] = proc
		
		# pass data until client disconnects, then terminate
		# see https://stackoverflow.com/questions/18511119/stop-processing-flask-route-if-request-aborted
		try:
			awaiting = [proc.stdout, proc.stderr]
			while awaiting:
				# wait for output on one or more pipes, or for proc to close a pipe
				ready, _, _ = select(awaiting, [], [])
				for pipe in ready:
					line = pipe.readline()
					if line:
						yield 'data: ' + line + '\n\n'
					else:
						# EOF, pipe was closed by proc
						awaiting.remove(pipe)
			if proc.poll() is None:
				print("process closed stdout and stderr but didn't terminate; terminating now.")
				proc.terminate()
		except GeneratorExit:
			# occurs when new output is yielded to a disconnected client
			print('client disconnected, killing process')
			proc.terminate()

		# wait for proc to finish and get return code
		ret_code = proc.wait()
		print("process return code:", ret_code)
		return
	rid=request.args['rid']
	return flask.Response(inner(rid), mimetype='text/event-stream')

def connResponse(message, lastUpdateTime):
	return {'lastChkTime': lastUpdateTime, 'message': message}

MIN_TIME = 1000 * 60 * 2
connCache = {}

@app.route('/testconn', methods=['POST'])
def test_connection():
	req = request.get_json()
	resp = []
	for item in req["items"]:
		tup = urlparse(item["url"])
		force = 'force' in item and item['force'] == 'true'
		host, port = tup.hostname, tup.port
		url = '{}:{}'.format(host, port)
		ctime = time.time()
		if url in connCache:
			print(ctime - connCache[url]['lastChkTime'])
		if url not in connCache or (ctime - connCache[url]['lastChkTime']) > MIN_TIME or force:
			print("force")
			sys.stdout.flush()
			try:
				hostip = socket.gethostbyname(host)
				s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
				s.settimeout(3)
				s.connect((hostip, port))
				s.close()
				connCache[url] = connResponse('up', ctime)
			except Exception as e:
				x = str(e)
				if ']' in x:
					x = x[x.index(']')+1:]
				connCache[url] = connResponse(x, ctime)

		ret = copy.copy(connCache[url])
		if 'extra' in item:
			ret['extra'] = item['extra']
		resp.append(ret)
	return {'items':resp}

# get stats from logs
p = re.compile('(.*)  .*INFO.*InodesFilter.*\[(.*)\] - \((.*)\) - ([A-Z]*) (.*) - (\d+)')
@app.route('/stats')
def get_stats():
	epoch = datetime.utcfromtimestamp(0)
	def d2u(s):
		dt = datetime.strptime(s, '%Y-%m-%d %H:%M:%S.%f')
		return (dt - epoch).total_seconds() * 1000.0
	data = []
	with open('{}/inodes.log'.format(os.environ['LOGS_DIR'])) as fp:
		#2021-04-18 20:16:37.169  INFO 26407 --- [nio-8080-exec-6] inodes.beans.InodesFilter : [admin] - (10.80.227.70) - POST /data/9bc5c950-5c1/approve - 200
		for line in fp.readlines():
			m = p.match(line)
			if m:
				try:data.append({'ts': d2u(m.group(1)), 'usr': m.group(2), 'ip': m.group(3), 'meth': m.group(4), 'res': m.group(5), 'cod': m.group(6)})
				except:print(m.group(1))
	return json.dumps(data)

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
	job_dir = '{}/{}/{}'.format(os.environ['EXEC_DIR'], user, job_id)
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
		taskstatus[task_id]['stdout'] = '/wf/joblogs/{}/{}/{}/stdout.txt'.format(user, job_id, task_id)
		taskstatus[task_id]['stderr'] = '/wf/joblogs/{}/{}/{}/stderr.txt'.format(user, job_id, task_id)
		taskstatus[task_id]['script'] = '/wf/joblogs/{}/{}/{}/script.sh'.format(user, job_id, task_id)

		#execute
		upd('running')
		ret = subprocess.call(['bash secure_execute.sh {} {} {} > {} 2> {}'.format(user, task_dir, script_path, stdout, stderr)], shell=True)
		upd('completed' if ret == 0 else 'failed')

		if task['inputs']['failWfOnTaskFailure']:
			failed = True
    
	if wf['state']['str'] == 'cancelling':
		updateWfStatus(lambda x: True, wf, 'stopped')
	else:
		updateWfStatus(lambda x: True, wf, 'failed' if failed else 'completed')

@app.route('/wf', methods = ['POST'])
def submitwf():
	usr = authenticate(request)
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

@app.route('/wf/joblogs/<user>/<jobid>/<taskid>/<type>', methods = ['GET'])
def serveLog(user, jobid, taskid, type):
	return send_from_directory(os.environ['EXEC_DIR'], '{}/{}/{}/{}'.format(user, jobid, taskid, type), as_attachment=False)

@app.route('/wf/<usr>/<jobid>/stop', methods = ['POST'])
def stopJob(usr, jobid):
	updateWfStatus(lambda x: x != 'completed', work_flows[usr][jobid], 'cancelling')
	return 'stop request sent.'

@app.route('/wf/<usr>/<jobid>/status', methods = ['GET'])
def jobStatus(usr, jobid):
	if usr in work_flows and jobid in work_flows[usr]:
		return work_flows[usr][jobid]['state']
	abort(404)
