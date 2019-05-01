// 'use strict'
// const { cacheControl } = require('../')
// const http = require('http')
// const express = require('express')
// const got = require('got')

// var httpServer = null
// var gotInstance = null
// var app = null

// const PORT = 9877

// afterAll(() => {
//   return new Promise((resolve, reject) => {
//     httpServer.close(resolve)
//   })
// })

// beforeAll(() => {
//   app = express()
//   app.use(cacheControl)

//   gotInstance = got.extend({
//     baseUrl: `http://localhost:${PORT}/`,
//     json: true,
//   })
//   httpServer = http.createServer(app)
//   return new Promise((resolve, reject) => {
//     httpServer.listen(PORT, resolve)
//   })
// })

// describe('cacheControl function tests', () => {
//   test('should return us the proper cacheControl', async () => {
//     const testObj = { data: { hoi: 'doei' } }
//     const route = '/test1'

//     app.get(route, (req, res) => {
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       return res.json(testObj)
//     })
//     const res = await gotInstance.get(route)
//     expect(res.headers['cache-control']).toBe('max-age=0')
//     expect(res.body).toEqual(testObj)
//   })

//   test('should return us the proper cacheControl 2', async () => {
//     const testObj = { data: { hoi: 'doei' } }
//     const route = '/test2'
//     app.get(route, (req, res) => {
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       res.setHeader('cache-control', 'max-age=10')
//       return res.json(testObj)
//     })
//     const res = await gotInstance.get(route)
//     expect(res.headers['cache-control']).toBe('max-age=10')
//     expect(res.body).toEqual(testObj)
//   })

//   test('should return us the proper cacheControl 3', async () => {
//     const testObj = { data: { hoi: 'doei' } }
//     const route = '/test3'
//     app.get(route, (req, res) => {
//       res.setHeader('content-type', 'application/json; charset=utf-8')
//       res.setHeader('cache-control', 'private')
//       return res.json(testObj)
//     })
//     const res = await gotInstance.get(route)
//     expect(res.headers['cache-control']).toBe('max-age=0, private')
//     expect(res.body).toEqual(testObj)
//   })
// })
