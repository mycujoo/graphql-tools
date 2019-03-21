FROM eu.gcr.io/mycujoo-fun-development/docker-nodejs-base:0.0.2

WORKDIR /src

# Copy the dependency files and install dependencies
# This happens before the source code so that the dependency layer can be cached between source code changes
COPY package.json yarn.lock .npmrc ./
RUN yarn install

# Add the rest of the source code
COPY . .

CMD ["node", "index.js"]
