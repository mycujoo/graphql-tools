'use strict'

const Redis = require('ioredis')
const debug = require('debug')('@mycujoo/graphql-tools:RedisCache')

class RedisCache {
  constructor({ apqTtl, redis, prefix = '' }) {
    this._redis = new Redis(redis)
    debug('connecting to ', redis)
    this._prefix = prefix
    this._ttl = apqTtl || 300
  }

  _formatKey(key) {
    return this._prefix + ': ' + key
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
          match: `${prefix}*`,
          count: 100,
        })
        .once('error', reject)
        .on('data', data => {
          keys = keys.concat(data)
        })
        .once('end', async () => {
          await Promise.all(
            keys.map(key => {
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
