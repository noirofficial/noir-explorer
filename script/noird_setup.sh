#!/bin/bash
# Download latest node and install.
noirlink=`curl -s https://api.github.com/repos/noirofficial/noir/releases/latest | grep browser_download_url | grep ubuntu | cut -d '"' -f 4`
mkdir -p /tmp/noir
cd /tmp/noir
curl -Lo noir.zip $noirlink
unzip noir.zip
sudo mv ./* /usr/local/bin
cd
rm -rf /tmp/noir
mkdir ~/.noir

# Setup configuration for node.
rpcuser=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 13 ; echo '')
rpcpassword=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32 ; echo '')
cat >~/.noir/noir.conf <<EOL
rpcuser=$rpcuser
rpcpassword=$rpcpassword
daemon=1
txindex=1
EOL

# Start node.
noird
