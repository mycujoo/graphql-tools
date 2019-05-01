'use strict'

const etag = require('etag')
const _ = require('lodash')

module.exports = logger => {
  return (req, res, next) => {
    if (!(req.method == 'GET' || req.method == 'HEAD')) return next()
    const ifNoneMatch = req.headers['if-none-match']
    let body = ''
    const resEnd = res.end.bind(res)

    res.write = data => {
      console.log('write data', data)
      body += data
    }

    res.end = data => {
      console.log('end data', data)
      if (data && data.length) body += data
      if (!body || body.length === 0) return resEnd()

      try {
        let payload
        if (
          res.getHeaders()['content-type'] &&
          res.getHeaders()['content-type'].includes('application/json')
        ) {
          // GQL Specific, we build the ETag based on the actual data, not based on the full gql response including extensions and what not
          payload = JSON.stringify(_.pick(JSON.parse(body), 'data', 'error'))
        } else {
          payload = body
        }
        if (payload && payload.length !== 0) {
          const tag = etag(payload, { weak: true })
          res.setHeader('ETag', tag)
          console.log('tag', tag)
          console.log('ifNoneMatch', ifNoneMatch)
          console.log('tag', tag)
          console.log('ifNoneMatch', ifNoneMatch)
          if (ifNoneMatch && ifNoneMatch === tag) {
            res.status(304)
          }
        }
      } catch (error) {
        logger.error(`ETag JSON parse error ${error.message}`)
      }
      return resEnd(body)
    }

    next()
  }
}
