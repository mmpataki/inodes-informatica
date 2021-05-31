source "$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )/consts.sh"
source "$ROOT_DIR/conf/installconfig.sh"

# start companion server
export FLASK_ENV=development
export FLASK_DEBUG=1
export INODES_URL="http://`hostname -f`:8080"
sudo -u "$INODESC_USER" -E bash -c "cd $COMPANION_DIR/bin; nohup python2 -m flask run --host 0.0.0.0 2>&1 >> $ROOT_DIR/logs/comps.log &"
echo "started the companion server"
