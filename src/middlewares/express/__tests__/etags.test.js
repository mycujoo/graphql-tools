'use strict'
const { etags } = require('../')
const http = require('http')
const express = require('express')
const got = require('got')
const etag = require('etag')
const logger = require('@mycujoo/logger')

let httpServer = null
let gotInstance = null
let app = null

let PORT

afterAll(() => {
  return new Promise((resolve, reject) => {
    httpServer.close(resolve)
  })
})

beforeAll(async () => {
  app = express()
  app.set('etag', false)
  app.use(etags(logger))

  httpServer = http.createServer(app)
  await new Promise((resolve, reject) => {
    httpServer.listen(PORT, resolve)
  })
  PORT = httpServer.address().port
  gotInstance = got.extend({
    baseUrl: `http://localhost:${PORT}/`,
    json: true,
  })
})

describe('ETags function tests', () => {
  test('should return us the proper etag', async () => {
    const testObj = { data: { hoi: 'doei' } }

    app.get('/test1', (req, res) => {
      res.setHeader('content-type', 'application/json; charset=utf-8')
      return res.json(testObj)
    })
    const res = await gotInstance.get('/test1')
    expect(res.headers.etag).toBe(etag(JSON.stringify(testObj), { weak: true }))
  })

  test('Should not return us on etag on post requests', async () => {
    const testObj = { data: { hoi: 'doei' } }

    app.post('/test1', (req, res) => {
      res.setHeader('content-type', 'application/json; charset=utf-8')
      return res.json(testObj)
    })
    const res = await gotInstance.post('/test1', { body: testObj.data })
    expect(res.headers.etag).toBeUndefined()
  })

  test('should return us the proper etag', async () => {
    const testObj = { data: { hoi: 'doei' } }
    let counter = 0
    const testObj2 = {
      error: ['Maybe something is wrong'],
      data: { hoi: 'doei' },
    }

    app.get('/test3', (req, res) => {
      res.setHeader('content-type', 'application/json; charset=utf-8')
      if (counter === 1) return res.json(testObj2)
      counter++
      return res.json(testObj)
    })
    const res = await gotInstance.get('/test3')
    const res1 = await gotInstance.get('/test3')
    expect(res.headers.etag).not.toBe(res1.headers.etag)
  })

  test('should return us the proper etag', async () => {
    const testObj = { data: { hoi: 'doei' } }

    app.get('/test6', (req, res) => {
      res.setHeader('content-type', 'application/json; charset=utf-8')
      return res.json(testObj)
    })
    const res = await gotInstance.get('/test6', {
      headers: {
        'if-none-match': etag(JSON.stringify(testObj), { weak: true }),
      },
    })
    expect(res.headers.etag).toBe(etag(JSON.stringify(testObj), { weak: true }))
    expect(res.statusCode).toBe(304)
    expect(res.body).toBeNull()
  })
})
