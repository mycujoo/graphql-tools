# graphql-tools

graphql-tools, datasources, middlewares, schema generators

## TODO:

GQL Middelware, auth middleware and metrics on gql side

## Available options

### RedisCache

A apollo-server-caching implementation with Redis. https://github.com/apollographql/apollo-server/tree/master/packages/apollo-server-caching

Usable for caching APQ queries.

### expressMiddlewares

- cache - Specifically build for GQL as the middleware will inspect the data and only cache if no errors are found. Cache-control headers are respected, public, max-age, no-cache, no-store etc.
- etags - Again, builds etags based on
- cacheControl

### MongodbDataSource

### kafkaDataSourceWrapper

### tracedDataSourceWrapper

### schemaFromAvro

### getServer
