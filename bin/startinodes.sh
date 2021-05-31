bindir="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

source $bindir/consts.sh
source "$ROOT_DIR/conf/installconfig.sh"

# start inodes
cd "$INODES_DIR"
ps -ef | grep "inodes-mai[n]"
if [ "$?" == 0 ]
then
    echo "inodes is already running, stop it first"
    exit
fi
cp "$ROOT_DIR/conf/config.properties" .
$bindir/installplugins.sh
sudo -u "$INODES_USER" -E bash -c "$M2_HOME/bin/mvn spring-boot:run 2>&1 >> $ROOT_DIR/logs/inodes.log &"
echo "started the inodes server"