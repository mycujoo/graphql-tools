'use strict'

const _ = require('lodash')
const DataLoader = require('dataloader')

class Database {
  constructor({ name, config, idField = 'id' }) {
    this._config = config
    this._name = name
    this._idField = idField
    this._dataloader = new DataLoader(
      async ids => {
        const request = {}
        request[idField] = ids
        const { items } = await this.find(null, request, null, null)
        return _.map(ids, id => {
          return _.find(items, item => {
            return item[idField] === id
          })
        })
      },
      {
        maxBatchSize: 500,
        cache: false,
      },
    )
  }

  getName() {
    return this._name
  }

  // Return the found doc / null
  findOne(root, args, context, info) {
    return this._dataloader.load(args[this._idField])
  }

  // Connect to your database
  async connect() {}

  // Disconnect from your database
  async disconnect() {}

  // Return the created doc
  async create(root, args, context, info) {}

  // Return the updated doc
  async update(root, args, context, info) {}

  // Return true / false if successful / failed
  async delete(root, args, context, info) {}

  // Return a cursor and items array.
  // {
  //   cursor: {
  //     start: 1,
  //     end: 1
  //   },
  //   items: [
  //     {
  //       doc: 1
  //     }
  //   ]
  // }
  async find(root, args, context, info) {}

  // Return  the number of docs that match the search query
  async count(root, args, context, info) {}
}

module.exports = Database
