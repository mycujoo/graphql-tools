'use strict'

module.exports = {
  RedisCache: require('./src/cache/Redis'),
  MongodbDatasource: require('./src/datasources/Mongodb'),
  expressMiddlewares: require('./src/middlewares/express'),
  kafkaDatasourceWrapper: require('./src/datasources/kafkaDatasourceWrapper'),
  schemaFromAvro: require('./src/schemas/schemaFromAvro').schemaFromAvro,
  // graphqlMiddlewares: require('./src/middlewares/graphql'),
}
