source "$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )/consts.sh"
source "$CONF_DIR/installconfig.sh"

execute create_inodes_dir from $ROOT_DIR with command makedir $MAIN_DIR 700 $INODES_USER
execute download_inodes from $ROOT_DIR with command wget --quiet https://github.com/mmpataki/inodes/archive/main.zip
execute unzip_inodes from $ROOT_DIR with command unzip -o -q main.zip; rm -rf main.zip
