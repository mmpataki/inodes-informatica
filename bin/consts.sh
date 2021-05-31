execute () { action=$1; shift; echo "executing $action"; "$@"; }

from () { wdir=$1; shift; cd $wdir; "$@"; }

with () { shift; "$@"; }

command () { shift; "$@"; }

makedir () { mkdir $1; chmod $2 $1; chown "$3:$3" $1; }


export ROOT_DIR="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )/.."
export MAIN_DIR="inodes-main"
export INODES_DIR="$ROOT_DIR/$MAIN_DIR"
export CONF_DIR="$ROOT_DIR/conf"
export COMPANION_DIR="$ROOT_DIR/companion"
export BIN_DIR="$COMPANION_DIR/bin"
export EXEC_DIR="$COMPANION_DIR/exec"
export ATTACH_DIR="$COMPANION_DIR/attach"