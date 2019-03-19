'use strict'

const Redis = require('ioredis')
const _ = require('lodash')
const crypto = require('crypto')

module.exports = (logger, options) => {
  const redis = new Redis(options.redis)
  const TTL = options.defaultTtl
  const CACHEABLE_HEADERS = [
    'vary',
    'content-type',
    'cache-control',
    'access-control-allow-origin',
  ]

  function hash(str) {
    return crypto
      .createHash('md5')
      .update(str)
      .digest('hex')
  }

  function getTtl(headers) {
    if (
      !headers['cache-control'] ||
      !headers['cache-control'].includes('max-age=')
    )
      return TTL

    const cc = headers['cache-control'].split(', ')
    const maxAge = _.find(cc, str => {
      return str.includes('max-age=')
    })
    const [, ttl] = maxAge.split('=')
    return Number(ttl)
  }

  function getCacheableHeaders(headers) {
    return JSON.stringify(_.pick(headers, CACHEABLE_HEADERS))
  }

  function storeInCache({ res, req, body }) {
    const contentType = res.getHeaders()['content-type']
    if (!contentType || !contentType.includes('application/json')) return false

    const resCacheControl = res.getHeaders()['cache-control']
    const reqCacheControl = req.headers['cache-control']

    if (!resCacheControl) {
      res.setHeader('cache-control', 'max-age=0')
      return false
    }

    if (reqCacheControl && reqCacheControl.includes('no-store')) return false

    if (
      resCacheControl &&
      (resCacheControl.includes('no-store') ||
        resCacheControl.includes('private'))
    )
      return false

    if (!body || body.length === 0) return false

    return true
  }

  function isFresh({ age, req }) {
    const reqCacheControl = req.headers['cache-control']

    if (!reqCacheControl) return true

    const rcc = reqCacheControl.split(', ')

    if (reqCacheControl.includes('min-fresh=')) {
      const minFresh = _.find(rcc, str => {
        return str.includes('min-fresh=')
      })

      const [, min] = minFresh.split('=')
      return min <= age
    } else if (reqCacheControl.includes('max-age=')) {
      const maxAge = _.find(rcc, str => {
        return str.includes('max-age=')
      })

      const [, max] = maxAge.split('=')
      return max >= age
    } else return true
  }

  function useCache(req) {
    if (req.method !== 'GET') return false
    if (
      req.headers['cache-control'] &&
      req.headers['cache-control'].includes('no-cache')
    )
      return false
    return true
  }

  function mustRevalidate({ req }) {
    return (
      req.headers['cache-control'] &&
      (req.headers['cache-control'].includes('proxy-revalidate') ||
        req.headers['cache-control'].includes('must-revalidate'))
    )
  }

  async function cacheLookup({ key, res, req }) {
    if (mustRevalidate({ req })) return false

    try {
      const cached = await redis.hgetall(key)
      if (_.isEmpty(cached) || !cached.body) return false

      const remainingTtl = await redis.ttl(key)

      const age = Number(cached.ttl) - remainingTtl

      if (!isFresh({ age, req })) return false

      res.setHeader('age', age)

      const headers = JSON.parse(cached.headers)

      _.each(headers, (value, header) => {
        res.setHeader(header, value)
      })
      res.status = 200
      res.end(cached.body)
      return true
    } catch (err) {
      logger.error(`Cache error ${err.message}`)
    }
    return false
  }

  return async (req, res, next) => {
    if (!useCache(req)) return next()

    const key = 'gql:' + hash(req.originalUrl)

    if (await cacheLookup({ key, req, res })) return

    let body = ''
    const resEnd = res.end.bind(res)

    res.write = data => {
      body += data
    }

    res.end = data => {
      if (data && data.length) body += data
      if (!storeInCache({ body, req, res })) return resEnd(body)

      try {
        const json = JSON.parse(body)
        if (!json.data || json.errors) return resEnd(body) // GQL Specific check, could be a lot of overhead without containing any real data.

        const ttl = getTtl(res.getHeaders())

        setImmediate(async () => {
          await redis
            .multi()
            .hmset(key, {
              headers: getCacheableHeaders(res.getHeaders()),
              url: req.originalUrl,
              ttl,
              body,
            })
            .expire(key, ttl)
            .exec()
        })
      } catch (err) {
        logger.error(`Cache error ${err.message}`)
      }
      return resEnd(body)
    }

    next()
  }
}
