'use strict'

const _ = require('lodash')
const debug = require('debug')
const dot = require('dot-object')
const mongodbUri = require('mongodb-uri')
const { MongoClient, ObjectID } = require('mongodb')

const Database = require('./Database')

class MongodbDatasource extends Database {
  constructor({ name, config, idField = 'id' }) {
    super({ name, config, idField })
    this.debug = debug(`@mycujoo/graphql-tools:MongodbDatasource:${name}`)
  }

  async connect() {
    const uri = mongodbUri.format(this._config)
    this.debug('Connecting to', uri)

    const connection = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      j: true,
    })

    this._connection = connection
    const databaseName = this._config.database || 'MongodbDatasource'
    this._db = this._connection.db(databaseName)
    this.debug(`Database: ${databaseName} collection: ${this._name}`)
    this._collection = this._db.collection(this._name)
  }

  disconnect() {
    this.debug('Disconnecting')
    return this._connection.close()
  }

  _getIdObject(id) {
    const obj = {}
    obj[this._idField] = this._idField === '_id' ? new ObjectID(id) : id
    return obj
  }

  _destructSort(sort) {
    const res = {}
    if (sort.includes('Asc')) {
      const [param] = sort.split('Asc')
      res[param] = 1
    } else if (sort.includes('Dsc')) {
      const [param] = sort.split('Dsc')
      res[param] = -1
    } else {
      throw new Error(`Unknown sort found ${sort}`)
    }
    return res
  }

  _formatSort(args) {
    return _.reduce(
      args,
      (m, c) => {
        const subsort = this._destructSort(c)
        return _.assign(m, subsort)
      },
      {},
    )
  }

  _formatQuery(args) {
    return _.reduce(
      args,
      (m, value, key) => {
        if (_.isArray(value))
          m[key] = {
            $in: value,
          }
        else m[key] = value
        return m
      },
      {},
    )
  }

  async create(parent, args, context, info) {
    const res = await this._collection.insertOne(args)
    const idObj = this._getIdObject(res.insertedId.toString())
    const doc = await this._collection.findOneAndUpdate(
      { _id: res.insertedId },
      { $set: idObj },
      { returnOriginal: false },
    )
    if (!doc && doc.value) return

    return doc.value
  }

  async update(parent, args, context, info) {
    const query = this._getIdObject(args[this._idField])
    const update = { $set: {} }

    dot.dot(_.omit(args, this._idField), update.$set)

    const item = await this._collection.findOneAndUpdate(query, update, {
      returnOriginal: false,
    })

    if (!item && item.value) return

    return item.value
  }

  async delete(parent, args, context, info) {
    const query = this._getIdObject(args[this._idField])
    const item = await this._collection.deleteOne(query)
    return item.result.ok === 1
  }

  // TODO Implement a dataloader
  findOne(parent, args, context, info) {
    const query = this._getIdObject(args[this._idField])

    return this._collection.findOne(query)
  }

  async find(parent, args, context, info) {
    const { limit, sort, after, before } = args
    let skip = 0
    if (after && before)
      throw new Error('Received conflicting before and after arguements')

    if (after) skip = Number(after)
    if (before) skip = Number(before) - limit
    if (skip < 0) skip = 0

    const queryOptions = _.omit(args, 'limit', 'sort', 'after', 'before')
    const sorting = this._formatSort(sort)
    const query = this._formatQuery(queryOptions)

    const items = await this._collection
      .find(query, { limit, sort: sorting, skip })
      .toArray()

    const start = skip
    const end = Number(skip) + items.length

    return {
      cursor: {
        start,
        end,
      },
      items,
    }
  }

  count(parent, args, context, info) {
    return this._collection.find(this._formatQuery(args)).count()
  }
}

module.exports = MongodbDatasource
