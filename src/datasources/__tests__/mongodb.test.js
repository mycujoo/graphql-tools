'use strict'

const config = require('config')
const testRunner = require('../__mocks__/generate-test')
const mongodbUri = require('mongodb-uri')
const { MongoClient } = require('mongodb')

const Mongodb = require('../Mongodb')

const uri = mongodbUri.format(config.mongodb)

describe('Mongodb', () => {
  beforeAll(async () => {
    const connection = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      j: true,
    })
    const databaseName = config.mongodb.database || 'MongodbDataSource'
    const db = await connection.db(databaseName)
    await db.dropDatabase()
    await connection.close()
  })

  describe('run the test suite one', () => {
    const mongodb = new Mongodb({
      name: 'Mongodb',
      config: config.mongodb,
      idField: 'id',
    })
    expect(mongodb.getName()).toEqual('Mongodb')
    testRunner(mongodb)
  })

  describe('run the test suite two', () => {
    const mongodbId = new Mongodb({
      name: 'MongodbId',
      config: config.mongodb,
      idField: '_id',
    })

    testRunner(mongodbId)
  })
})
