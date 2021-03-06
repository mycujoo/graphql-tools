'use strict'

const _ = require('lodash')
const Redis = require('ioredis')
const debug = require('debug')('@mycujoo/graphql-tools:RedisCache')

class RedisCache {
  constructor({ ttl, redis, prefix = '' }) {
    this._prefix = prefix
    debug('prefix set at', this._prefix)
    this._ttl = ttl || 300
    debug('default ttl set at', this._ttl)
    debug('connecting to ', redis)
    this._redis = new Redis(redis)
    this._redis.on('connect', () => {
      debug('(re)connected')
    })
  }

  _formatKey(key) {
    if (!this._prefix) return key
    return this._prefix + ':' + key
  }

  set(key, data, options = { ttl: this._ttl }) {
    return this._redis.set(this._formatKey(key), data, 'EX', options.ttl)
  }

  get(key) {
    return this._redis.get(this._formatKey(key))
  }

  flush(prefix) {
    let keys = []
    return new Promise((resolve, reject) => {
      this._redis
        .scanStream({
          match: this._formatKey(`${prefix}*`),
          count: 100,
        })
        .once('error', reject)
        .on('data', data => {
          keys = keys.concat(data)
        })
        .once('end', async () => {
          await Promise.all(
            _.map(keys, key => {
              return this._redis.del(key)
            }),
          )
          resolve()
        })
    })
  }

  close() {
    debug('disconnecting')
    return this._redis.disconnect()
  }
}

module.exports = RedisCache
