'use strict'

module.exports = {
  RedisCache: require('./src/cache/Redis'),
  MongodbDatasource: require('./src/datasources/Mongodb'),
  schemaFromAvro: require('./src/schemas/schemaFromAvro').schemaFromAvro,
  expressMiddlewares: require('./src/middlewares/express'),
  // graphqlMiddlewares: require('./src/middlewares/graphql'),
}
