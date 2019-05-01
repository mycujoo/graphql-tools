// 'use strict'

// const _ = require('lodash')
// const http = require('http')
// const Redis = require('ioredis')
// const express = require('express')
// const config = require('config')
// const logger = require('@mycujoo/logger')
// const got = require('got')

// const { cache, etags } = require('../')

// var httpServer = null
// var gotInstance = null
// var app = null
// var PORT = null

// afterAll(() => {
//   if (!httpServer) return
//   return new Promise((resolve, reject) => {
//     httpServer.close(resolve)
//   })
// })

// beforeAll(async done => {
//   app = express()
//   app.set('etag', false)
//   app.use(etags(logger))
//   app.use(cache(logger, { redis: config.redis, prefix: 'test' }))

//   httpServer = http.createServer(app)

//   httpServer.listen({ port: 0 }, () => {
//     PORT = httpServer.address().port
//     gotInstance = got.extend({
//       baseUrl: `http://localhost:${PORT}`,
//       json: true,
//     })
//     const redis = new Redis(config.redis)
//     let keys = []
//     redis
//       .scanStream({
//         match: 'test*',
//         count: 100,
//       })
//       .once('error', done)
//       .on('data', data => {
//         keys = keys.concat(data)
//       })
//       .once('end', async () => {
//         if (keys.length === 0) return done()
//         await Promise.all(
//           _.map(keys, key => {
//             return redis.del(key)
//           }),
//         )
//         done()
//       })
//   })
// })

// describe('Cache function tests', () => {
//   test('cache test, should return cached result second call', async () => {
//     const testObj = { data: { hoi: 'doei' } }

//     app.get('/test1', (req, res) => {
//       res.setHeader('cache-control', 'max-age=50')
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       return res.end(JSON.stringify(testObj))
//     })

//     const res = await gotInstance.get('/test1')

//     expect(res.body).toEqual(testObj)
//     expect(res.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res.headers['cache-control']).toBe('max-age=50')
//     expect(res.headers['age']).toBeUndefined()

//     const res2 = await gotInstance.get('/test1')

//     expect(res2.body).toEqual(testObj)
//     expect(res2.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res2.headers['cache-control']).toBe('max-age=50')
//     expect(res2.headers['age']).toBe('0')
//   })

//   test('private tests, should not return cached results when the backend sends private results', async () => {
//     const testObj = { data: { hoi: 'doei' } }

//     app.get('/test2', (req, res) => {
//       res.setHeader('cache-control', 'max-age=50, private')
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       return res.end(JSON.stringify(testObj))
//     })

//     const res = await gotInstance.get('/test2')

//     expect(res.body).toEqual(testObj)
//     expect(res.headers['age']).toBeUndefined()
//     expect(res.headers['cache-control']).toBe('max-age=50, private')
//     expect(res.headers['content-type']).toBe('application/json; charset=utf-8')

//     const res2 = await gotInstance.get('/test2')

//     expect(res2.headers['age']).toBeUndefined()
//     expect(res2.headers['cache-control']).toBe('max-age=50, private')
//     expect(res2.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res2.body).toEqual(testObj)

//     const res3 = await gotInstance.get('/test2', {
//       headers: { 'cache-control': 'no-cache' },
//     })

//     expect(res3.body).toEqual(testObj)
//     expect(res3.headers['cache-control']).toBe('max-age=50, private')
//     expect(res3.headers['age']).toBeUndefined()
//     expect(res3.headers['content-type']).toBe('application/json; charset=utf-8')
//   })

//   test('no-store test, should not cache the initial request', async () => {
//     const testObj = { data: { hoi: 'doei' } }

//     app.get('/test3', (req, res) => {
//       res.setHeader('cache-control', 'no-store')
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       return res.end(JSON.stringify(testObj))
//     })

//     const res = await gotInstance.get('/test3')

//     expect(res.body).toEqual(testObj)
//     expect(res.headers['cache-control']).toBe('no-store')
//     expect(res.headers['age']).toBeUndefined()
//     expect(res.headers['content-type']).toBe('application/json; charset=utf-8')

//     const res2 = await gotInstance.get('/test3')

//     expect(res2.body).toEqual(testObj)
//     expect(res2.headers['cache-control']).toBe('no-store')
//     expect(res2.headers['age']).toBeUndefined()
//     expect(res2.headers['content-type']).toBe('application/json; charset=utf-8')

//     const res3 = await gotInstance.get('/test1')

//     expect(res3.body).toEqual(testObj)
//     expect(res3.headers['cache-control']).toBe('max-age=50')
//     expect(res3.headers['age']).toBe('0')
//     expect(res3.headers['content-type']).toBe('application/json; charset=utf-8')

//     const res4 = await gotInstance.get('/test1', {
//       headers: { 'cache-control': 'no-store' },
//     })

//     expect(res4.body).toEqual(testObj)
//     expect(res4.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res4.headers['cache-control']).toBe('max-age=50')
//     expect(res4.headers['age']).toBe('0')
//   })

//   test('min-fresh tests, should not return cache if we request higher min-fresh then remaining ttl on the cache', async () => {
//     const testObj = { data: { hoi: 'doei' } }
//     const route = '/test4'

//     app.get(route, (req, res) => {
//       res.setHeader('cache-control', 'max-age=50')
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       return res.end(JSON.stringify(testObj))
//     })

//     const res = await gotInstance.get(route)

//     expect(res.body).toEqual(testObj)
//     expect(res.headers['age']).toBeUndefined()
//     expect(res.headers['cache-control']).toBe('max-age=50')
//     expect(res.headers['content-type']).toBe('application/json; charset=utf-8')

//     const res1 = await gotInstance.get(route)

//     expect(res1.body).toEqual(testObj)
//     expect(res1.headers['age']).toBe('0')
//     expect(res1.headers['cache-control']).toBe('max-age=50')
//     expect(res1.headers['content-type']).toBe('application/json; charset=utf-8')

//     const res2 = await gotInstance.get(route, {
//       headers: { 'cache-control': 'min-fresh=51' },
//     })

//     expect(res2.headers['age']).toBeUndefined()
//     expect(res2.headers['cache-control']).toBe('max-age=50')
//     expect(res2.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res2.body).toEqual(testObj)

//     const res3 = await gotInstance.get(route)

//     expect(res3.body).toEqual(testObj)
//     expect(res3.headers['age']).toBe('0')
//     expect(res3.headers['cache-control']).toBe('max-age=50')
//     expect(res3.headers['content-type']).toBe('application/json; charset=utf-8')
//   })

//   test('min-fresh tests, incombination with no-store', async () => {
//     const testObj = { data: { hoi: 'doei' } }
//     const route = '/test5'

//     app.get(route, (req, res) => {
//       res.setHeader('cache-control', 'max-age=50')
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       return res.end(JSON.stringify(testObj))
//     })

//     const res4 = await gotInstance.get(route, {
//       headers: { 'cache-control': 'no-store, min-fresh=51' },
//     })

//     expect(res4.headers['age']).toBeUndefined()
//     expect(res4.headers['cache-control']).toBe('max-age=50')
//     expect(res4.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res4.body).toEqual(testObj)

//     const res5 = await gotInstance.get(route)

//     expect(res5.body).toEqual(testObj)
//     expect(res5.headers['age']).toBeUndefined()
//     expect(res5.headers['cache-control']).toBe('max-age=50')
//     expect(res5.headers['content-type']).toBe('application/json; charset=utf-8')
//   })

//   test('max-age tests, should not return cached results if the cache age is higher then max-age', async () => {
//     const testObj = { data: { hoi: 'doei' } }
//     const route = '/test6'

//     app.get(route, (req, res) => {
//       res.setHeader('cache-control', 'max-age=50')
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       return res.end(JSON.stringify(testObj))
//     })

//     const res4 = await gotInstance.get(route, {
//       headers: { 'cache-control': 'max-age=10' },
//     })

//     expect(res4.headers['age']).toBeUndefined()
//     expect(res4.headers['cache-control']).toBe('max-age=50')
//     expect(res4.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res4.body).toEqual(testObj)

//     const res5 = await gotInstance.get(route, {
//       headers: { 'cache-control': 'max-age=10' },
//     })

//     expect(res5.body).toEqual(testObj)
//     expect(res5.headers['age']).toBe('0')
//     expect(res5.headers['cache-control']).toBe('max-age=50')
//     expect(res5.headers['content-type']).toBe('application/json; charset=utf-8')

//     return new Promise(async (resolve, reject) => {
//       setTimeout(async () => {
//         const res5 = await gotInstance.get(route, {
//           headers: { 'cache-control': 'max-age=1' },
//         })

//         expect(res5.body).toEqual(testObj)
//         expect(res5.headers['age']).toBeUndefined()
//         expect(res5.headers['cache-control']).toBe('max-age=50')
//         expect(res5.headers['content-type']).toBe(
//           'application/json; charset=utf-8',
//         )
//         resolve()
//       }, 2000)
//     })
//   })

//   test('html/text should not be cached', async () => {
//     const text = '<html>cat videos</html>'
//     const route = '/test7'

//     app.get(route, (req, res) => {
//       res.setHeader('cache-control', 'public, max-age=100')
//       res.setHeader('content-type', 'text/html; charset=utf-8')
//       return res.end(text)
//     })

//     const res = await got.get(`http://localhost:${PORT}${route}`, {
//       headers: { 'cache-control': 'max-age=10' },
//     })

//     expect(res.headers['age']).toBeUndefined()
//     expect(res.headers['cache-control']).toBe('public, max-age=100')
//     expect(res.headers['content-type']).toBe('text/html; charset=utf-8')
//     expect(res.body).toEqual(text)

//     const res1 = await got.get(`http://localhost:${PORT}${route}`, {
//       headers: { 'cache-control': 'max-age=10' },
//     })

//     expect(res1.headers['age']).toBeUndefined()
//     expect(res1.headers['cache-control']).toBe('public, max-age=100')
//     expect(res1.headers['content-type']).toBe('text/html; charset=utf-8')
//     expect(res1.body).toEqual(text)
//   })

//   test('revalidation tests, should return fresh-results not from cache', async () => {
//     const testObj = { data: { hoi: 'doei' } }
//     const route = '/test8'

//     app.get(route, (req, res) => {
//       res.setHeader('cache-control', 'max-age=50')
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       return res.end(JSON.stringify(testObj))
//     })

//     const res0 = await gotInstance.get(route, {
//       headers: { 'cache-control': 'max-age=10' },
//     })

//     expect(res0.headers['age']).toBeUndefined()
//     expect(res0.headers['cache-control']).toBe('max-age=50')
//     expect(res0.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res0.body).toEqual(testObj)

//     const res1 = await gotInstance.get(route, {
//       headers: { 'cache-control': 'max-age=10' },
//     })

//     expect(res1.body).toEqual(testObj)
//     expect(res1.headers['age']).toBe('0')
//     expect(res1.headers['cache-control']).toBe('max-age=50')
//     expect(res1.headers['content-type']).toBe('application/json; charset=utf-8')

//     const res2 = await gotInstance.get(route, {
//       headers: { 'cache-control': 'max-age=50, must-revalidate' },
//     })

//     expect(res2.body).toEqual(testObj)
//     expect(res2.headers['age']).toBeUndefined()
//     expect(res2.headers['cache-control']).toBe('max-age=50')
//     expect(res2.headers['content-type']).toBe('application/json; charset=utf-8')

//     const res3 = await gotInstance.get(route, {
//       headers: { 'cache-control': 'max-age=10' },
//     })

//     expect(res3.body).toEqual(testObj)
//     expect(res3.headers['age']).toBe('0')
//     expect(res3.headers['cache-control']).toBe('max-age=50')
//     expect(res3.headers['content-type']).toBe('application/json; charset=utf-8')

//     const res4 = await gotInstance.get(route, {
//       headers: { 'cache-control': 'max-age=50, proxy-revalidate' },
//     })

//     expect(res4.body).toEqual(testObj)
//     expect(res4.headers['age']).toBeUndefined()
//     expect(res4.headers['cache-control']).toBe('max-age=50')
//     expect(res4.headers['content-type']).toBe('application/json; charset=utf-8')
//   })

//   test('no-cache tests, should not return cache', async () => {
//     const testObj = { data: { hoi: 'doei' } }
//     const route = '/test9'
//     app.get(route, (req, res) => {
//       res.setHeader('cache-control', 'max-age=50')
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       return res.end(JSON.stringify(testObj))
//     })

//     const res1 = await gotInstance.get(route)

//     expect(res1.body).toEqual(testObj)
//     expect(res1.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res1.headers['cache-control']).toBe('max-age=50')
//     expect(res1.headers['age']).toBeUndefined()

//     const res2 = await gotInstance.get(route)

//     expect(res2.body).toEqual(testObj)
//     expect(res2.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res2.headers['cache-control']).toBe('max-age=50')
//     expect(res2.headers['age']).toBe('0')

//     const res3 = await gotInstance.get(route, {
//       headers: { 'cache-control': 'no-cache' },
//     })

//     expect(res3.body).toEqual(testObj)
//     expect(res3.headers['cache-control']).toBe('max-age=50')
//     expect(res3.headers['age']).toBeUndefined()
//     expect(res3.headers['content-type']).toBe('application/json; charset=utf-8')
//   })

//   test('lacking control on source should still return max-age=0', async () => {
//     const testObj = { data: { hoi: 'doei' } }
//     const route = '/test11'
//     app.get(route, (req, res) => {
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       return res.end(JSON.stringify(testObj))
//     })

//     const res1 = await gotInstance.get(route)

//     expect(res1.body).toEqual(testObj)
//     expect(res1.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res1.headers['cache-control']).toBe('max-age=0')
//     expect(res1.headers['age']).toBeUndefined()
//   })

//   test('cors', async () => {
//     const testObj = { data: { hoi: 'doei1' } }
//     const route = '/test10'
//     app.get(route, (req, res) => {
//       res.setHeader('cache-control', 'max-age=50')
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       res.setHeader('access-control-allow-origin', '*')
//       return res.end(JSON.stringify(testObj))
//     })

//     const res1 = await gotInstance.get(route)

//     expect(res1.body).toEqual(testObj)
//     expect(res1.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res1.headers['access-control-allow-origin']).toBe('*')
//     expect(res1.headers['cache-control']).toBe('max-age=50')
//     expect(res1.headers['age']).toBeUndefined()

//     const res2 = await gotInstance.get(route)

//     expect(res2.body).toEqual(testObj)
//     expect(res2.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res1.headers['access-control-allow-origin']).toBe('*')
//     expect(res2.headers['cache-control']).toBe('max-age=50')
//     expect(res2.headers['age']).toBe('0')
//   })

//   test('Dont cache when there are errors', async () => {
//     const testObj = { errors: [{ message: 'waah' }] }
//     const route = '/test12'
//     app.get(route, (req, res) => {
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       return res.end(JSON.stringify(testObj))
//     })

//     const res1 = await gotInstance.get(route)

//     expect(res1.body).toEqual(testObj)
//     expect(res1.headers['content-type']).toBe('application/json; charset=utf-8')
//     expect(res1.headers['cache-control']).toBe('max-age=0')
//     expect(res1.headers['age']).toBeUndefined()
//   })
// })
