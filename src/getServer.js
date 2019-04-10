'use strict'

const compression = require('compression')
const express = require('express')
const helmet = require('helmet')
const http = require('http')
const { etags, cache, cacheControl } = require('./middlewares/express')
const logger = require('@mycujoo/logger')

module.exports = ({ redis, project }) => {
  const app = express()

  app
    .use(helmet())
    .use(compression())
    .use(etags(logger))
    .use(cacheControl)
    .use(
      cache(logger, {
        prefix: project,
        redis,
      }),
    )

  const server = http.createServer(app)
  return { server, app }
}
