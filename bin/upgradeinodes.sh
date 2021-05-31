bindir="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

source $bindir/consts.sh

echo "stopping inodes server"
$bindir/stopinodes.sh

echo "removing existing installation"
rm -rf "$MAIN_DIR"

echo "upgrading inodes server"
$bindir/installinodes.sh

echo "restarting inodes server"
$bindir/startinodes.sh
