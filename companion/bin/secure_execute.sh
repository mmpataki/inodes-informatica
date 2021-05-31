# secure_execute.sh
#  switch to a user, run the script, logout

user=$1
taskdir=$2

shift
shift

id "$user"
if [ "$?" != 0 ]
then
    useradd --no-create-home "$user"
fi

sudo -u "$user" bash -c "cd $taskdir; $@"
