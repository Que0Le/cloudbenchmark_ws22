

## Install and run

Ubuntu 20, Node 16

```bash
sudo apt update
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
sudo apt install -y docker-ce

sudo usermod -aG docker ${USER}
su - ${USER}

git clone git@github.com:Que0Le/cloudbenchmark_ws22.git 
cd cloudbenchmark_ws22
mkdir appwrite


# Appwrite
docker run -it --rm \
    --volume /var/run/docker.sock:/var/run/docker.sock \
    --volume "$(pwd)"/appwrite:/usr/src/code/appwrite:rw \
    --entrypoint="install" \
    appwrite/appwrite:1.1.1

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

MAX_REQ_PER_TASK=5; MAX_REQ=500; CB_SESSION_ID=session1; rm log_client_[0-9]_*.txt; node clustering_request.js $CB_SESSION_ID $MAX_REQ_PER_TASK $MAX_REQ; python3 read_data.py $CB_SESSION_ID

CB_SESSION_ID=session1; python3 read_data.py $CB_SESSION_ID
```