source "$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )/consts.sh"
source "$ROOT_DIR/conf/installconfig.sh"

sudo -u "$INODES_USER" -E pkill -u "$INODES_USER"
