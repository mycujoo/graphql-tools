'use strict'

const compression = require('compression')
const express = require('express')
const getTracer = require('@mycujoo/express-jaeger')
const helmet = require('helmet')
const http = require('http')
const logger = require('@mycujoo/logger')
const methodOverride = require('method-override')

const { etags, cache, cacheControl } = require('./middlewares/express')

module.exports = ({ redis, project, tracing }) => {
  const app = express()

  const { trace, tracer, injectHttpHeaders } = getTracer(tracing)

  app
    .use(trace)
    .use(helmet())
    .use(methodOverride())
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

  return { server, app, tracer, injectHttpHeaders }
}
