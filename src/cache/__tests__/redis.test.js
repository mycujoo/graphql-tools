'use strict'

const RedisCache = require('../Redis')
const config = require('config')
const Redis = require('ioredis')

let redis, redisCache

describe('Redis cache function tests', () => {
  beforeAll(async () => {
    redis = new Redis(config.redis)
    redisCache = new RedisCache({
      redis: config.redis,
      prefix: 'test2',
    })
  })
  afterAll(() => {
    return redisCache.close()
  })
  test('set a key', async () => {
    const data = 'test1'
    await redisCache.set('bla', data)
    const res = await redis.get('test2:bla')
    expect(res).toEqual(data)
    await redis.del('test2:bla')
  })
  test('get a key', async () => {
    const data = 'test2'
    await redis.set('test2:bla1', data)
    const res = await redisCache.get('bla1')
    expect(res).toEqual(data)
    await redis.del('test2:bla1')
  })
  test('flush a key', async () => {
    const data = 'test3'
    await redis.set('test2:bla2', data)
    const res = await redisCache.get('bla2')
    expect(res).toEqual(data)
    await redisCache.flush('bla')
    const res2 = await redisCache.get('bla2')
    expect(res2).toBeNull()
  })
  test('default prefix', async () => {
    redisCache = new RedisCache({
      redis: config.redis,
    })
    const data = 'test4'
    await redisCache.set('bla', data)
    const res = await redis.get(':bla')
    expect(res).toEqual(data)
  })
})
