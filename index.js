'use strict'

module.exports = {
  RedisCache: require('./src/cache/Redis'),
  MongodbDataSource: require('./src/datasources/Mongodb'),
  expressMiddlewares: require('./src/middlewares/express'),
  kafkaDataSourceWrapper: require('./src/datasources/kafkaDataSourceWrapper'),
  schemaFromAvro: require('./src/schemas/schemaFromAvro').schemaFromAvro,
  getServer: require('./src/getServer'),
  // graphqlMiddlewares: require('./src/middlewares/graphql'),
}
