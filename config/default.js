'use strict'

const env = process.env.NODE_ENV || 'development'

module.exports = {
  redis: {
    host: 'localhost',
    port: 6379,
  },
  mongodb: {
    hosts: [{ host: 'localhost', port: 27017 }],
    database: `${env}_graphql-tools`,
    options: {},
  },
}
