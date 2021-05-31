# secure_execute.sh
#  switch to a user, run the script, logout

user=$1
taskdir=$2

shift
shift

id "$user" 2>&1 > /dev/null
if [ "$?" != 0 ]
then
    sudo useradd --no-create-home "$user" 2>&1 > /dev/null
fi

sudo -E -u "$user" bash -c "cd $taskdir; bash $@"
