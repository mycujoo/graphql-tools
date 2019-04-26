'use strict'

module.exports = (Datasource, tracer, name = 'Datasource') => {
  class TracedDatasource extends Datasource {
    async create(...args) {
      const span = tracer.startSpan(`${name} create`, {
        operationName: `${name} create`,
        childOf: this.context.spanContext,
      })
      const res = await super.create.apply(this, args)
      span.finish()
      return res
    }

    async update(...args) {
      const span = tracer.startSpan(`${name} update`, {
        operationName: `${name} update`,
        childOf: this.context.spanContext,
      })
      const res = await super.update.apply(this, args)
      span.finish()
      return res
    }

    async increment(...args) {
      const span = tracer.startSpan(`${name} increment`, {
        operationName: `${name} increment`,
        childOf: this.context.spanContext,
      })
      const res = await super.increment.apply(this, args)
      span.finish()
      return res
    }
    async findOne(...args) {
      const span = tracer.startSpan(`${name} findOne`, {
        operationName: `${name} findOne`,
        childOf: this.context.spanContext,
      })
      const res = await super.findOne.apply(this, args)
      span.finish()
      return res
    }
    async delete(...args) {
      const span = tracer.startSpan(`${name} delete`, {
        operationName: `${name} delete`,
        childOf: this.context.spanContext,
      })
      const res = await super.delete.apply(this, args)
      span.finish()
      return res
    }
    async find(...args) {
      const span = tracer.startSpan(`${name} find`, {
        operationName: `${name} find`,
        childOf: this.context.spanContext,
      })
      const res = await super.find.apply(this, args)
      span.finish()
      return res
    }
    async count(...args) {
      const span = tracer.startSpan(`${name} count`, {
        operationName: `${name} count`,
        childOf: this.context.spanContext,
      })
      const res = await super.count.apply(this, args)
      span.finish()
      return res
    }
  }
  return TracedDatasource
}
