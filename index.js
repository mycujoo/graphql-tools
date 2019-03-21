'use strict'

module.exports = {
  RedisCache: require('./src/cache/Redis'),
  MongodbDataSource: require('./src/datasources/Mongodb'),
  expressMiddlewares: require('./src/middlewares/express'),
  kafkaDataSourceWrapper: require('./src/datasources/kafkaDataSourceWrapper'),
  schemaFromAvro: require('./src/schemas/schemaFromAvro').schemaFromAvro,
  // graphqlMiddlewares: require('./src/middlewares/graphql'),
}
