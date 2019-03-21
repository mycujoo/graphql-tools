'use strict'

const { Producer } = require('@mycujoo/kafka-clients')

const debug = require('debug')

module.exports = (DatabaseDataSource, addAdditive) => {
  class KafkaDatabaseDataSource extends DatabaseDataSource {
    constructor({ name, config, idField = 'id', kafka }) {
      super({ name, config, idField })
      this.name = name
      this.idField = idField
      this.debug = debug(`beatnik:MongodbKafkaDatasource:${name}`)
      this.debug('producing to topic', kafka.topic)
      this.producer = new Producer(kafka)
    }

    async produce(doc) {
      const wares = { value: doc, key: doc[this.idField] }
      this.debug(`${this.name} sending a newly updated message to kafka`, wares)
      await this.producer.produce(wares)
      this.debug(
        `${this.name} successfully send a newly updated message to kafka`,
      )
    }

    async create(...args) {
      const res = await super.create.apply(this, args)
      const doc = addAdditive(res)
      await this.produce(doc)
      return res
    }

    async update(...args) {
      const res = await super.update.apply(this, args)
      const doc = addAdditive(res)
      await this.produce(doc)
      return res
    }
  }
  return KafkaDatabaseDataSource
}
