'use strict'
const { etags } = require('../')
const http = require('http')
const express = require('express')
const got = require('got')
const etag = require('etag')

var httpServer = null
var gotInstance = null
var app = null

const PORT = 9876

afterAll(() => {
  return new Promise((resolve, reject) => {
    httpServer.close(resolve)
  })
})

beforeAll(() => {
  app = express()
  app.set('etag', false)
  app.use(etags)

  gotInstance = got.extend({
    baseUrl: `http://localhost:${PORT}/`,
    json: true,
  })
  httpServer = http.createServer(app)
  return new Promise((resolve, reject) => {
    httpServer.listen(PORT, resolve)
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
})
