'use strict'

const config = require('config')
const fs = require('fs')
const { gql } = require('apollo-server-express')

const { makeExecutableSchema } = require('graphql-tools')
const { schemaFromAvro } = require('../../../')
const { MongodbDataSource } = require('../../datasources')

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
  {
    options: {
      avroSchema: require('../__mocks__/pe_issues_item-updated_v1-value.1.json'),
      mutations: { create: true, update: false, delete: false },
      queries: { count: true, find: true, findOne: true },
      omitFields: ['traceToken', 'eventId', 'updatedAt'],
      sortableFields: ['title', 'typeId'],
      queryableFields: ['typeId', 'deleted'],
      cacheControl: { maxAge: 300 },
    },
    dataSource: new MongodbDataSource({
      name: 'issueItem',
      config: config.mongodb,
    }),
    typeDef: `
      extend type IssueItem {
        type: IssueType
        resolverGroup: ResolverGroup
      }
    `,
    resolver: {
      IssueItem: {
        resolverGroup: (parent, args, context, info) => {
          return context.dataSources.resolverGroup.findOne(
            null,
            {
              id: parent.resolverGroupId,
            },
            context,
            info,
          )
        },
        type: (parent, args, context, info) => {
          return context.dataSources.issueType.findOne(
            null,
            {
              id: parent.typeId,
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
      avroSchema: require('../__mocks__/pe_issues_issue-updated_v1-value.1.json'),
      cacheControl: { maxAge: 30 },
      mutations: { create: true, update: true, delete: true },
      queries: { count: true, find: true, findOne: true },
      omitFields: ['traceToken', 'eventId', 'updatedAt'],
      queryableFields: ['severity', 'browser', 'status', 'itemId', 'deleted'],
      rangeQueryableFields: ['createdAt', 'votes'],
      incrementableFields: ['votes'],
      sortableFields: [
        'createdAt',
        'itemId',
        'severity',
        'status',
        'title',
        'votes',
      ],
    },
    dataSource: new MongodbDataSource({
      name: 'issue',
      config: config.mongodb,
    }),
    typeDef: `
      extend type Issue {
        item: IssueItem
      }
    `,
    resolver: {
      Issue: {
        item: (parent, args, context, info) => {
          return context.dataSources.issueItem.findOne(
            null,
            {
              id: parent.itemId,
            },
            context,
            info,
          )
        },
      },
    },
  },
]

describe('Schema tests', () => {
  describe('FromAvro', () => {
    test('Converting schema 1', done => {
      const { typeDefs, resolvers } = schemaFromAvro(schema1)
      fs.readFile(
        './src/schemas/__mocks__/typedefs.txt',
        { encoding: 'utf-8' },
        (err, data) => {
          if (err) return done(err)
          expect(typeDefs.join()).toEqual(data)
          typeDefs.unshift(cacheControl)
          expect(() => {
            makeExecutableSchema({ typeDefs, resolvers })
          }).not.toThrow()
          done()
        },
      )
    })
  })
})
