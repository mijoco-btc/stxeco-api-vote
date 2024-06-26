#!/bin/bash -e
#
############################################################

export SERVER=spinoza.brightblock.org;
export DOCKER_NAME=stxeco_api_vote
export PORT=22

if [ "$DEPLOYMENT" == "testnet" ]; then
  SERVER=leibniz.brightblock.org;
fi
if [ "$DEPLOYMENT" == "devnet" ]; then
  SERVER=descartes.brightblock.org;
fi

export DOCKER_ID_USER='mijoco'
export DOCKER_CMD='docker'

$DOCKER_CMD build -t mijoco/stxeco_api_vote .
$DOCKER_CMD tag mijoco/stxeco_api_vote mijoco/stxeco_api_vote
$DOCKER_CMD push mijoco/stxeco_api_vote:latest

printf "\n\n===================================================="
printf "\nConnecting to: $SERVER:$PORT"
printf "\nDeploying docker container: $DOCKER_NAME"

ssh -p $PORT bob@$SERVER "
  source ~/.profile;
  docker login;
  docker pull mijoco/stxeco_api_vote;
  docker rm -f stxeco_api_vote  
  docker run -d -t -i --network host --env-file ~/.env --name stxeco_api_vote -p 3010:3010 mijoco/stxeco_api_vote
";

printf "Finished....\n"
printf "\n-----------------------------------------------------------------------------------------------------\n";

exit 0;

