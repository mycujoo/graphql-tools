#!/bin/bash

echo ${GCLOUD_SERVICE_KEY} | base64 -d > ${HOME}/gcp-key.json
