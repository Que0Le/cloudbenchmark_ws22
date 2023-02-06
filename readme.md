

## Install and run

```bash
# debian 11, node 16
sudo apt update
sudo apt install git htop



#### Client
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo bash - &&\
sudo apt-get install -y nodejs
git clone https://github.com/Que0Le/cloudbenchmark_ws22.git
cd cloudbenchmark_ws22
mkdir log_data




### Server
# Appwrite
mkdir appwrite
sudo docker run -it --rm --volume /var/run/docker.sock:/var/run/docker.sock --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw --entrypoint="install" -e _APP_OPTIONS_ABUSE=disabled appwrite/appwrite:1.1.1
git clone https://github.com/Que0Le/cloudbenchmark_ws22.git
cd cloudbenchmark_ws22

```


Ubuntu 20, Node 16

```bash
sudo apt update
sudo apt install git htop
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
sudo apt install -y docker-ce

sudo usermod -aG docker ${USER}
su - ${USER}

# Appwrite
mkdir appwrite
sudo docker run -it --rm --volume /var/run/docker.sock:/var/run/docker.sock --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw --entrypoint="install" -e _APP_OPTIONS_ABUSE=disabled appwrite/appwrite:1.1.1


git clone https://github.com/Que0Le/cloudbenchmark_ws22.git
cd cloudbenchmark_ws22


## stop
docker container stop $(docker container ls -q --filter name=appwrite*)

# Choose your server HTTP port: (default: 80)
# 80
# Choose your server HTTPS port: (default: 443)
# 443
# Choose a secret API key, make sure to make a backup of your key in a secure location (default: 'your-secret-key')

# Enter your Appwrite hostname (default: 'localhost')

# Enter a DNS A record hostname to serve as a CNAME for your custom domains.
# You can use the same value as used for the Appwrite hostname. (default: 'localhost')

# Running "docker compose -f /usr/src/code/appwrite/docker-compose.yml up -d --remove-orphans --renew-anon-volumes"

# http://localhost:3000/

```


```bash
sudo apt install python3.8-venv
python3 -m venv env
source env/bin/activate

# python3 -m pip install pip install -r requirements.txt
# pip3 freeze > requirements.txt
python3 -m pip install uvicorn fastapi psutil matplotlib numpy
# Ctrl+Shift+P to select Python interpreter

uvicorn system_stat:app --host 0.0.0.0 --port 8888

# extract deps
# pip freeze > requirements.txt
```

```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash - &&\
sudo apt-get install -y nodejs

sudo apt install npm
npm i


mkdir log_data
## POST
POSTGET=post MAX_REQ_PER_TASK=2 MAX_REQ=2000 NBR_WORKERS=10 RUN_MODE=silent DB_DATA_HALF_LENGTH=100
SESSION_ID_POST="${POSTGET}.workers=${NBR_WORKERS}.task_size=${MAX_REQ_PER_TASK}.total=${MAX_REQ}.column_length=${DB_DATA_HALF_LENGTH}"
# rm log_client_*[0-9]_*post*.txt
NODE_NO_WARNINGS=1 node mass_post.js $SESSION_ID_POST $MAX_REQ_PER_TASK $MAX_REQ $NBR_WORKERS $RUN_MODE $DB_DATA_HALF_LENGTH
python3 read_data.py $SESSION_ID_POST

## GET
COLLECTION_ID=63d929846ad2459e4ed7
POSTGET=get MAX_REQ_PER_TASK=2 MAX_REQ=2000 NBR_WORKERS=10 RUN_MODE=silent DB_DATA_HALF_LENGTH=100
SESSION_ID_GET="${POSTGET}.workers=${NBR_WORKERS}.task_size=${MAX_REQ_PER_TASK}.total=${MAX_REQ}.column_length=${DB_DATA_HALF_LENGTH}"
rm log_client_*[0-9]_*get*.txt
NODE_NO_WARNINGS=1 node mass_get.js $SESSION_ID_GET $MAX_REQ_PER_TASK $MAX_REQ $NBR_WORKERS $RUN_MODE $COLLECTION_ID $SESSION_ID_POST
python3 read_data.py $SESSION_ID_GET

node -i -e "$(< ./mass_get.js)"

```