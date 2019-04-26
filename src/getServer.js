'use strict'

const compression = require('compression')
const express = require('express')
const helmet = require('helmet')
const http = require('http')
const { etags, cache, cacheControl } = require('./middlewares/express')
const logger = require('@mycujoo/logger')
const getTracer = require('@mycujoo/express-jaeger')

module.exports = ({ redis, project, tracing }) => {
  const app = express()

  const { trace, tracer, injectHttpHeaders } = getTracer(tracing)

  app
    .use(helmet())
    .use(compression())
    .use(etags(logger))
    .use(trace)
    .use(cacheControl)
    .use(
      cache(logger, {
        prefix: project,
        redis,
      }),
    )

  const server = http.createServer(app)
  return { server, app, tracer, injectHttpHeaders }
}
