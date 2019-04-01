'use strict'

const _ = require('lodash')
const { camelize, pascalize } = require('humps')

const baseTypeConversions = {
  ID: () => {
    return 'ID'
  },
  boolean: () => {
    return 'Boolean'
  },
  int: () => {
    return 'Int'
  },
  long: () => {
    return 'Float'
  },
  string: () => {
    return 'String'
  },
}

function schemaFromAvro(parts) {
  const dataSources = _.reduce(
    parts,
    (m, { options, dataSource }) => {
      m[dataSource.getName()] = dataSource
      return m
    },
    {},
  )

  const schemaParts = []
  _.each(parts, ({ options, dataSource, typeDef, resolver }) => {
    if (typeDef) schemaParts.push({ typeDef })
    if (resolver) schemaParts.push({ resolver })
    schemaParts.push(
      avroToGraphql(
        _.assign({ dataSourceName: dataSource.getName() }, options),
      ),
    )
  })

  const typeDefs = _.compact(_.map(schemaParts, 'typeDef'))
  const resolvers = _.merge(_.compact(_.map(schemaParts, 'resolver')))
  return { dataSources, typeDefs, resolvers }
}

function avroToGraphql({
  avroSchema,
  cacheControl,
  createCursor,
  dataSourceName,
  idField,
  incrementableFields,
  mutations,
  omitFields = [],
  queries,
  queryableFields,
  rangeQueryableFields,
  sortableFields,
}) {
  avroSchema.fields = _.filter(avroSchema.fields, ({ name }) => {
    return _.indexOf(omitFields, name) === -1
  })

  const gqlSchema = new GqlSchema({
    avro: avroSchema,
    cacheControl,
    createCursor,
    dataSourceName,
    idField,
    incrementableFields,
    mutations,
    queries,
    queryableFields,
    rangeQueryableFields,
    sortableFields,
  })
  const typeDef = gqlSchema.getTypeDef()
  const resolver = gqlSchema.getResolver()
  return { typeDef, resolver }
}

class GqlSchema {
  constructor({
    avro,
    cacheControl,
    createCursor = false,
    dataSourceName,
    idField = 'id',
    incrementableFields = [],
    mutations,
    queries,
    queryableFields = [],
    rangeQueryableFields = [],
    sortableFields = [],
  }) {
    this.avro = avro
    this.mutations = mutations
    this.idField = idField
    this.queryableFields = queryableFields
    this.incrementableFields = incrementableFields
    this.rangeQueryableFields = rangeQueryableFields
    this.extendQuery = !_.isNil(queries.extend) ? queries.extend : true
    this.extendMutation = !_.isNil(mutations.extend) ? mutations.extend : true
    this.dataSourceName =
      dataSourceName || camelize(this.avro.name.toLowerCase())
    this.cacheControl = cacheControl
    this.resolver = {}
    this.types = []
    this.enums = []
    this.inputs = []
    this.unions = []
    this.queryFields = []
    this.sortEnum = this.createSortEnum(sortableFields)
    if (createCursor) this.createCursor()
  }

  getResolver() {
    return this.resolver
  }

  createFindQuery(queryName) {
    let queryType = `\t${queryName}(\n`
    let multiInput = true
    _.each(this.queryFields, line => {
      if (typeof line === 'object') {
        multiInput = line.multiInput
        line = line.line
      }
      if (line.includes('\t')) line = line.split('\t')[1]
      line = _.without(line.split(''), '!').join('')
      const lineParts = line.split(':')
      let type = lineParts[1].trim()
      if (multiInput && type.indexOf('[') !== 0) {
        type = `[${type}]`
      }
      line = `${lineParts[0]} : ${type}`
      queryType += `\t\t${line}\n`
    })
    _.each(this.rangeQueryableFields, field => {
      queryType += `\t\t_range_${field}: InputRangeSelector\n`
    })

    queryType += `\t\t_limit: Int!\n`
    queryType += `\t\t_after: ID\n`
    queryType += `\t\t_before: ID\n`
    if (this.sortEnum) queryType += `\t\t_sort: [${this.sortEnum}]\n`

    queryType += `\t): ${pascalize(this.avro.name)}Cursor\n`
    return queryType
  }

  createCountQuery(queryName) {
    let queryType = `\t${queryName}`
    if (this.queryFields.length + this.rangeQueryableFields.length !== 0) {
      queryType += `(\n`
    }

    _.each(this.rangeQueryableFields, field => {
      queryType += `\t\t_range_${field}: InputRangeSelector\n`
    })
    _.each(this.queryFields, line => {
      if (line.line) line = line.line
      if (line.includes('\t')) line = line.split('\t')[1]
      line = _.without(line.split(''), '!').join('')
      const lineParts = line.split(':')
      line = `${lineParts[0]} : [${lineParts[1].trim()}]`
      queryType += `\t\t${line}\n`
    })
    if (this.queryFields.length + this.rangeQueryableFields.length !== 0) {
      queryType += `\t)`
    }
    queryType += `: Int!\n`
    return queryType
  }

  createQueries() {
    // if (this.queryableFields.length === 0) return
    const queryName = this.avro.name.toLowerCase() + 's'
    const queryNameCount = this.avro.name.toLowerCase() + 'sCount'
    let queryType = 'extend type Query {\n'
    const findQuery = this.createFindQuery(queryName)
    queryType += findQuery
    queryType += '\n'
    const countQuery = this.createCountQuery(queryNameCount)
    queryType += countQuery
    queryType += '}'
    this.types.push(queryType)
    this.addQueryToResolver(queryName, 'find')
    this.addQueryToResolver(queryNameCount, 'count')
    this.createType(
      {
        name: `${pascalize(this.avro.name)}Cursor`,
        fields: [
          {
            name: 'cursor',
            type: 'Cursor',
            doc: 'Cursor',
          },
          {
            name: 'items',
            doc: `${pascalize(this.avro.name)}s`,
            type: { type: 'array', items: this.avro },
          },
        ],
      },
      false,
    )
  }

  createCursor() {
    this.createType(
      {
        name: 'Cursor',
        fields: [
          {
            name: 'start',
            type: 'ID',
            doc: 'Start of page',
          },
          {
            name: 'end',
            type: 'ID',
            doc: 'End of page',
          },
        ],
      },
      false,
    )
    this.createInput({
      name: 'RangeSelector',
      fields: [
        {
          name: 'gt',
          type: ['null', 'int'],
          doc: 'Greater than',
        },
        {
          name: 'lt',
          type: ['null', 'int'],
          doc: 'Less than',
        },
        {
          name: 'gte',
          type: ['null', 'int'],
          doc: 'Greater than or equal',
        },
        {
          name: 'lte',
          type: ['null', 'int'],
          doc: 'Less than or equal',
        },
      ],
    })
  }

  createSortEnum(sortableFields) {
    const symbolsAsc = _.map(sortableFields, field => {
      return field + 'Asc'
    })
    const symbolsDsc = _.map(sortableFields, field => {
      return field + 'Dsc'
    })
    const symbols = symbolsAsc.concat(symbolsDsc).sort()
    const name = pascalize(this.avro.name) + 'Sort'
    const doc = `${name} sort options`
    return this.createEnum({ name, doc, symbols })
  }

  getTypeDef(options) {
    return this.getSchema(options)
  }

  getSchema(options) {
    this.createType(this.avro, null, true)
    this.createQueryType()
    if (this.mutations) this.createMutationType()
    if (this.queryableFields) this.createQueries()
    const schema = this.unions
      .concat(this.enums)
      .concat(this.inputs)
      .concat(this.types)
      .join('\n\n')

    this.types = []
    this.enums = []
    this.unions = []

    return schema
  }

  createMutationType() {
    this.setMutationResolver()

    let mutationType = `${
      this.extendMutation ? 'extend ' : ''
    }type Mutation {\n`

    const modelName = pascalize(this.avro.name)

    if (this.mutations.create) {
      const mutationTypeName = 'create'
      const mutationName = camelize(`${mutationTypeName}_` + this.avro.name)

      this.addMutationToResolver(mutationName, mutationTypeName)
      const createProps = this.getCreateProps(this.avro)

      mutationType += `\t${mutationName}(\n${createProps}\t): ${modelName}!\n\n`
    }

    if (this.mutations.update) {
      const mutationTypeName = 'update'
      const mutationName = camelize(`${mutationTypeName}_` + this.avro.name)
      this.addMutationToResolver(mutationName, mutationTypeName)
      const updateProps = this.getUpdateProps(this.avro, true)
      mutationType += `\t${mutationName}(\n${updateProps}\t): ${modelName}\n\n`
    }

    if (this.mutations.delete) {
      const mutationTypeName = 'delete'
      const mutationName = camelize(`${mutationTypeName}_` + this.avro.name)
      this.addMutationToResolver(mutationName, mutationTypeName)
      mutationType += `\t${mutationName}(${this.idField}: ID!): Boolean!\n`
    }

    if (this.incrementableFields.length) {
      const mutationTypeName = 'increment'
      const mutationName = camelize(`${mutationTypeName}_` + this.avro.name)
      let mutation = `\t${mutationName}(${this.idField} : ID! `
      _.each(this.incrementableFields, field => {
        mutation += ` ${field}: Int`
      })

      mutation += `): ${pascalize(this.avro.name)}\n`
      this.addMutationToResolver(mutationName, mutationTypeName)
      mutationType += mutation
    }

    mutationType += '}\n'
    this.types.push(mutationType)
  }

  createQueryType() {
    const queryName = camelize(this.avro.name)
    let queryType = `${this.extendQuery ? 'extend ' : ''}type Query {\n`
    queryType += `\t${queryName}(${this.idField}: ID!): ${pascalize(
      this.avro.name,
    )}\n`
    queryType += '}'
    this.types.push(queryType)
    this.setQueryResolver()
    this.addQueryToResolver(queryName, 'findOne')
  }

  addQueryToResolver(queryName, queryType) {
    this.resolver.Query[queryName] = (parent, args, context, info) => {
      return context.dataSources[this.dataSourceName][queryType](
        parent,
        args,
        context,
        info,
      )
    }
  }

  setQueryResolver() {
    if (this.resolver.Query) return
    this.resolver.Query = {}
  }

  addMutationToResolver(mutationName, mutationType) {
    // const dataSourceName = this.datSourceName
    this.resolver.Mutation[mutationName] = (parent, args, context, info) => {
      return context.dataSources[this.dataSourceName][mutationType](
        parent,
        args,
        context,
        info,
      )
    }
  }

  setMutationResolver() {
    if (this.resolver.Mutation) return
    this.resolver.Mutation = {}
  }

  createUnion(items, name) {
    const unionName = pascalize(name)
    items = _.sortBy(items, 'name')
    const unionParts = _.map(items, this.createType.bind(this))
    let unionString = ''
    _.each(unionParts, (part, index) => {
      unionString += part
      if (index !== unionParts.length - 1) unionString += ' | '
    })

    const resolverFn = item =>
      _.find(unionParts, part => {
        return part === item.__type
      })

    this.resolver[unionName] = {
      __resolveType: resolverFn,
    }
    this.unions.unshift(`union ${unionName} = ${unionString}`)
    this.unions.unshift(`scalar Input${unionName}`)
    this.unions = _.uniq(this.unions)
  }

  processObjectType(type, name, optional) {
    if (type.type === 'enum') {
      const enumName = this.createEnum(type)
      return {
        enom: true,
        type: `${enumName}${optional ? '' : '!'}`,
        doc: type.doc,
      }
    }
    if (type.type === 'record') {
      const typeName = this.createType(type)
      return { type: `${typeName}${optional ? '' : '!'}`, doc: type.doc }
    }
    if (type.type === 'array') {
      if (Array.isArray(type.items)) {
        // Might not event be nullable?
        const nullLessTypes = _.without(type.items, 'null')
        const isNullable = optional || nullLessTypes.length !== type.items
        this.createUnion(type.items, name)
        return { type: `[${pascalize(name)}]${isNullable ? '' : '!'}` }
      } else if (
        typeof type.items === 'string' &&
        baseTypeConversions[type.items]
      ) {
        return {
          type: `[${baseTypeConversions[type.items]()}]!`,
          baseType: true,
        }
      } else {
        const typeName = this.createType(type.items)
        return { type: `[${typeName}]!` }
      }
    }
  }

  processArrayType(types, name, optional) {
    const nullLessTypes = _.without(types, 'null')
    const isNullable = optional || nullLessTypes.length !== types.length
    if (nullLessTypes.length === 1) {
      const processedType = this.processType(nullLessTypes[0], name)
      if (
        isNullable // &&
        // processedType.type[processedType.type.length - 1] === '!'
      ) {
        processedType.type = this.removeNonNullable(processedType.type)
        // .slice(
        //     0,
        //     processedType.type.length - 1,
        //   )
      }
      return processedType
    }
    throw new Error(
      `Problem doc, cant deal with ${name}, ${JSON.stringify(types)}`,
    )
  }

  processType(type, name, optional) {
    if (typeof type === 'string') {
      if (
        name === 'id' ||
        name === '_id' ||
        name.slice(name.length - 2) === 'Id'
      )
        return { baseType: true, type: `ID${optional ? '' : '!'}` }
      const gqlType = baseTypeConversions[type]
      return {
        baseType: true,
        type: `${gqlType ? gqlType() : type}${optional ? '' : '!'}`,
      }
    }

    if (Array.isArray(type)) {
      return this.processArrayType(type, name, optional)
    }
    return this.processObjectType(type, name, optional)
  }

  removeNonNullable(type) {
    if (_.indexOf(type, '!') === type.length - 1) {
      type = type.slice(0, type.length - 1)
    }
    return type
  }

  processInputFieldTypeName({ type, doc, baseType, enom }) {
    if (!baseType && !enom) {
      if (_.indexOf(type, '[') === 0) {
        let outerNullable = true
        if (_.indexOf(type, '!') === type.length - 1) {
          outerNullable = false
          type = type.slice(0, type.length - 1)
        }
        type = type.slice(1, type.length - 1)
        return `[Input${type}]${outerNullable ? '' : '!'}`
      }
      return `Input${type}`
    }
    return type
  }

  processQueryFieldTypeName({ type, doc, baseType, enom }) {
    if (!baseType && !enom) {
      if (_.indexOf(type, '[') === 0) {
        let outerNullable = true
        if (_.indexOf(type, '!') === type.length - 1) {
          outerNullable = false
          type = type.slice(0, type.length - 1)
        }
        type = type.slice(1, type.length - 1)
        return `Query${type}${outerNullable ? '' : '!'}`
      }
      return `Query${type}`
    }
    return type
  }

  processField(
    { name, type, doc },
    createDoc = true,
    inputField = false,
    queryField = false,
  ) {
    const processedType = this.processType(type, name, queryField)
    const response = `${
      createDoc ? '"' + (doc || processedType.doc) + '"\n\t' : ''
    }${name}: ${
      inputField
        ? queryField
          ? this.processQueryFieldTypeName(processedType)
          : this.processInputFieldTypeName(processedType)
        : processedType.type
    }`
    return response
  }

  createInput({ name, fields }) {
    fields = _.sortBy(fields, 'name')
    let type = _.reduce(
      fields,
      (m, field) => {
        return m + '\t' + this.processField(field, null, true) + '\n'
      },
      `input Input${pascalize(name)} {\n`,
    )
    type += '}'
    this.inputs.unshift(type)
    this.inputs = _.uniq(this.inputs)
    return pascalize(name)
  }

  createQueryInput({ name, fields }) {
    fields = _.sortBy(fields, 'name')
    let type = _.reduce(
      fields,
      (m, field) => {
        return m + '\t' + this.processField(field, null, true, true) + '\n'
      },
      `input Query${pascalize(name)} {\n`,
    )
    type += '}'
    this.inputs.unshift(type)
    this.inputs = _.uniq(this.inputs)
    return pascalize(name)
  }

  createType({ name, fields }, createInput = true, topLevel = false) {
    fields = _.sortBy(fields, 'name')
    let type = `type ${pascalize(name)}`
    if (!_.isNil(this.cacheControl)) {
      type += ' @cacheControl('
      if (
        !_.isNil(this.cacheControl.maxAge) &&
        !_.isNil(this.cacheControl.scope)
      )
        type += `maxAge: ${this.cacheControl.maxAge}, scope: ${
          this.cacheControl.scope
        })`
      else if (!_.isNil(this.cacheControl.maxAge))
        type += `maxAge: ${this.cacheControl.maxAge})`
      else type += `scope: ${this.cacheControl.scope})`
    }

    type += ' {\n'
    type = _.reduce(
      fields,
      (m, field) => {
        const processedField = this.processField(field)
        if (
          !createInput &&
          this.queryableFields.length &&
          _.indexOf(this.queryableFields, field.name) !== -1
        ) {
          this.queryFields.push(processedField)
          if (typeof field.type === 'object') {
            if (Array.isArray(field.type)) {
              if (
                _.some(field.type, ft => {
                  if (!ft || typeof ft !== 'object' || !ft.type) return false
                  return ft.type === 'record'
                })
              ) {
                this.queryFields.pop()
                const inputProcessedField = this.processField(
                  field,
                  null,
                  true,
                  true,
                )
                this.createQueryInput(
                  _.find(field.type, tp => {
                    return tp !== 'null'
                  }),
                )
                this.queryFields.push({
                  line: inputProcessedField,
                  multiInput: false,
                })
              }
            }
          }
        }
        return m + '\t' + processedField + '\n'
      },
      type,
    )
    type += '}'
    this.types.unshift(type)
    this.types = _.uniq(this.types)
    if (createInput) this.createInput({ name, fields })
    return pascalize(name)
  }

  getCreateProps({ name, fields }, includeId = false) {
    fields = _.sortBy(fields, 'name')
    let type = _.reduce(
      fields,
      (m, field) => {
        if (!includeId && field.name === this.idField) return m
        return m + '\t\t' + this.processField(field, false, true) + '\n'
      },
      '',
    )
    return type
  }

  getUpdateProps({ name, fields }, includeId = true) {
    fields = _.sortBy(fields, 'name')
    let type = _.reduce(
      fields,
      (m, field) => {
        if (!includeId && field.name === this.idField) return m
        let processedField = this.processField(field, false, true)
        if (field.name !== this.idField)
          processedField = this.removeNonNullable(processedField)
        return m + '\t\t' + processedField + '\n'
      },
      '',
    )
    return type
  }

  createEnum({ name, symbols, doc }) {
    if (!_.isArray(symbols) || symbols.length === 0) return
    let enom = _.reduce(
      symbols.sort(),
      (m, symbol) => {
        return m + '\t' + symbol + '\n'
      },
      `enum ${pascalize(name)} {\n`,
    )
    enom += '}'
    this.enums.unshift(enom)
    this.enums = _.uniq(this.enums)
    return pascalize(name)
  }
}

module.exports = {
  avroToGraphql,
  schemaFromAvro,
  GqlSchema,
}
