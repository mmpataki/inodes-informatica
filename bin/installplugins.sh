bindir="$( cd -- "$(dirname "$0")" >/dev/null 2>&1 ; pwd -P )"

. "$bindir/consts.sh"
. "$CONF_DIR/installconfig.sh"

execute register_informatica_specific_inodes_plugins from $ROOT_DIR
for plugin in $(/bin/ls -1 plugins)
do
    execute create_plugin_directory with command mkdir "$INODES_DIR/klasses/$plugin"
    execute move_plugin_defn with command cp "plugins/$plugin/class.json" "$INODES_DIR/klasses/$plugin"
    execute move_plugin_ui_data with command cp -r plugins/"$plugin"/pdata/* "$INODES_DIR/src/main/resources/static/"
done

execute add_infomatica_files_to_webserver from $ROOT_DIR cp -r www/* "$INODES_DIR/src/main/resources/static/"
