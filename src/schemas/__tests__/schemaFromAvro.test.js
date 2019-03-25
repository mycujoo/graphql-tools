'use strict'

const config = require('config')
const { gql } = require('apollo-server-express')

const { makeExecutableSchema } = require('graphql-tools')
const { schemaFromAvro } = require('../../../')
const { MongodbDataSource } = require('../../datasources')
const crypto = require('crypto')
function hash(str) {
  return crypto
    .createHash('md5')
    .update(str)
    .digest('hex')
}
const cacheControl = gql`
  enum CacheControlScope {
    PUBLIC
    PRIVATE
  }

  directive @cacheControl(
    maxAge: Int
    scope: CacheControlScope
  ) on FIELD_DEFINITION | OBJECT | INTERFACE
`
const schema1 = [
  {
    options: {
      avroSchema: require('../__mocks__/pe_issues_category-updated_v1-value.1.json'),
      omitFields: ['traceToken', 'eventId', 'updatedAt'],
      mutations: { create: true, update: false, delete: false, extend: false },
      queries: { count: true, find: true, findOne: true, extend: false },
      queryableFields: [],
      sortableFields: ['title'],
      cacheControl: { maxAge: 300 },
      createCursor: true,
    },
    dataSource: new MongodbDataSource({
      name: 'issueCategory',
      config: config.mongodb,
    }),
  },
  {
    options: {
      avroSchema: require('../__mocks__/pe_issues_type-updated_v1-value.1.json'),
      mutations: { create: true, update: false, delete: false },
      queries: { count: true, find: true, findOne: true },
      omitFields: ['traceToken', 'eventId', 'updatedAt'],
      sortableFields: ['title', 'categoryId'],
      queryableFields: ['categoryId'],
      cacheControl: { maxAge: 300 },
    },
    dataSource: new MongodbDataSource({
      name: 'issueType',
      config: config.mongodb,
    }),
    typeDef: `
      extend type IssueType {
        category: IssueCategory
      }
    `,
    resolver: {
      IssueType: {
        category: (parent, args, context, info) => {
          return context.dataSources.issueCategory.findOne(
            null,
            {
              id: parent.categoryId,
            },
            context,
            info,
          )
        },
      },
    },
  },
  {
    options: {
      avroSchema: require('../__mocks__/pe_issues_resolvergroup-updated_v1-value.1.json'),
      mutations: { create: true, update: false, delete: false },
      queries: { count: true, find: true, findOne: true },
      omitFields: ['traceToken', 'eventId', 'updatedAt'],
      sortableFields: ['slackChannel', 'email', 'description', 'title'],
      queryableFields: ['userIds', 'slackChannel', 'email', 'title', 'deleted'],
      cacheControl: { maxAge: 300 },
    },
    dataSource: new MongodbDataSource({
      name: 'resolverGroup',
      config: config.mongodb,
    }),
  },
]

describe('Schema tests', () => {
  describe('FromAvro', () => {
    test('Converting schema 1', () => {
      const { typeDefs, resolvers } = schemaFromAvro(schema1)
      expect(hash(typeDefs.join())).toEqual('70e91250793b186d3fb24ce2e32e3488')
      typeDefs.unshift(cacheControl)
      expect(() => {
        makeExecutableSchema({ typeDefs, resolvers })
      }).not.toThrow()
    })
  })
})
