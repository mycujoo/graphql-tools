'use strict'

const _ = require('lodash')
const debug = require('debug')
const dot = require('dot-object')
const mongodbUri = require('mongodb-uri')
const { MongoClient, ObjectID } = require('mongodb')

const Database = require('./Database')

class Mongodb extends Database {
  constructor({ name, config, idField = 'id' }) {
    super({ name, config, idField })
    this.debug = debug(`@mycujoo/graphql-tools:MongodbDataSource:${name}`)
  }

  async connect() {
    const uri = mongodbUri.format(this._config)
    this.debug('Connecting to', uri)

    const connection = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      j: true,
    })

    this._connection = connection
    const databaseName = this._config.database || 'MongodbDataSource'
    this._db = this._connection.db(databaseName)
    this.debug(`Database: ${databaseName} collection: ${this._name}`)
    this._collection = this._db.collection(this._name)
  }

  disconnect() {
    this.debug('Disconnecting')
    return this._connection.close()
  }

  processId(id) {
    return this._idField === '_id' ? new ObjectID(id) : id
  }

  _getIdObject(id) {
    const obj = {}
    obj[this._idField] = this.processId(id)
    return obj
  }

  _destructSort(sort) {
    const res = {}
    if (sort.includes('Asc')) {
      const [param] = sort.split('Asc')
      const attributeName = param.replace('_', '.')
      res[attributeName] = 1
    } else if (sort.includes('Dsc')) {
      const [param] = sort.split('Dsc')
      const attributeName = param.replace('_', '.')
      res[attributeName] = -1
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

  _formatRangeQuery(name, options) {
    const attributeNames = name.split('_range_')[1]
    const attributeName = attributeNames.replace('_', '.')
    const value = _.reduce(
      options,
      (m, value, key) => {
        m[`$${key}`] = value
        return m
      },
      {},
    )
    const res = {}
    res[attributeName] = value
    return res
  }

  _formatQuery(args) {
    return _.reduce(
      args,
      (m, value, key) => {
        if (key.startsWith('_range_')) {
          return _.assign(this._formatRangeQuery(key, value), m)
        } else if (typeof value === 'object' && !Array.isArray(value)) {
          _.each(_.keys(value), subKey => {
            const obj = {}
            obj[`${key}.${subKey}`] = value[subKey]
            m = _.merge(this._formatQuery(obj), m)
          })
          return m
        } else if (_.isArray(value)) {
          m[key] = {
            $in: value,
          }
        } else {
          m[key] = value
        }
        return m
      },
      {},
    )
  }

  processResponse(doc) {
    if (!doc) return null
    if (this._idField === '_id') {
      doc._id = doc._id.toString()
      return doc
    }
    return _.omit(doc, '_id')
  }

  async increment(parent, args, context, info) {
    super.increment.apply(this, [null, args])
    const query = this._getIdObject(args[this._idField])
    const update = { $inc: {} }

    dot.dot(_.omit(args, this._idField), update.$inc)

    const doc = await this._collection.findOneAndUpdate(query, update, {
      returnOriginal: false,
    })
    if (!doc && doc.value) return

    return this.processResponse(doc.value)
  }

  async findOne(...args) {
    const res = await super.findOne.apply(this, args)
    return this.processResponse(res)
  }

  async create(parent, args, context, info) {
    const res = await this._collection.insertOne(args)
    const idObj = this._getIdObject(res.insertedId.toString())
    const doc = await this._collection.findOneAndUpdate(
      { _id: res.insertedId },
      { $set: idObj },
      { returnOriginal: false },
    )
    return this.processResponse(doc.value)
  }

  async update(parent, args, context, info) {
    const query = this._getIdObject(args[this._idField])
    const update = { $set: {} }

    dot.dot(_.omit(args, this._idField), update.$set)

    const doc = await this._collection.findOneAndUpdate(query, update, {
      returnOriginal: false,
    })

    if (!doc && doc.value) return

    return this.processResponse(doc.value)
  }

  async delete(parent, args, context, info) {
    const query = this._getIdObject(args[this._idField])
    const item = await this._collection.deleteOne(query)
    return item.result.ok === 1
  }

  async find(parent, args, context, info) {
    const { _limit, _sort, _after, _before } = args
    let skip = 0
    if (_after && _before)
      throw new Error('Received conflicting before and after arguements')

    if (_after) skip = Number(_after)
    if (_before) skip = Number(_before) - _limit
    if (skip < 0) skip = 0

    const queryOptions = _.omit(args, '_limit', '_sort', '_after', '_before')
    const sorting = this._formatSort(_sort)
    const query = this._formatQuery(queryOptions)

    const items = await this._collection
      .find(query, { limit: _limit, sort: sorting, skip })
      .toArray()

    const start = skip
    const end = Number(skip) + items.length

    return {
      cursor: {
        start,
        end,
      },
      items: _.map(items, item => {
        return this.processResponse(item)
      }),
    }
  }

  count(parent, args, context, info) {
    return this._collection.find(this._formatQuery(args)).count()
  }
}

module.exports = Mongodb
