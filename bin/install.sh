# inodes instller

bindir="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"
. $bindir/consts.sh

if [ "$#" != "2" ]
then
        echo "Usage: $0 inodes_user_name inodesc_user_name"
        exit
fi

uinodes=$1
uinodesc=$2
rootdir="$ROOT_DIR"

execute create_inodes_user with command useradd $uinodes
execute create_inodesc_user with command useradd $uinodesc

execute create_root_dir with command makedir $rootdir 705 $uinodes
execute create_conf_dir from $rootdir with command makedir conf 744 $uinodes
execute create_conf_dir from $rootdir with command makedir logs 777 $uinodes
execute create_attach_dir from $rootdir with command makedir attach 600 $uinodes
execute create_backup_dir from $rootdir with command makedir backup 600 $uinodes

echo > "$rootdir/conf/installconfig.sh"
echo "export INODES_USER=$uinodes" >> "$rootdir/conf/installconfig.sh"
echo "export INODESC_USER=$uinodesc" >> "$rootdir/conf/installconfig.sh"
echo "export INODESC_PASS=create a user with name $uinodesc and paste the password here" >> "$rootdir/conf/installconfig.sh"

execute create_inodesc_exec_dir from $rootdir/companion with command makedir exec 777 $uinodesc
execute create_inodesc_attach_dir from $rootdir/companion with command makedir attach 600 $uinodesc

$bindir/installinodes.sh

echo "creating a config.properties file in ${rootdir}conf please update it"
execute create_permanent_config from $rootdir/conf with command cp "$rootdir/$MAIN_DIR/config.properties" config.properties

$bindir/installplugins.sh