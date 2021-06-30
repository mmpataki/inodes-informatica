bindir="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

source $bindir/consts.sh

echo "stopping companion server"
$bindir/stopcompanion.sh

cd $ROOT_DIR/..

echo "upgrading companion server"
rm -f main.zip
wget --quiet https://github.com/mmpataki/inodes-informatica/archive/refs/heads/main.zip
unzip -o -q main.zip

chmod +x $bindir/*

$bindir/installplugins.sh

echo "restarting companion server"
$bindir/startcompanion.sh
