'use strict'

module.exports = (req, res, next) => {
  let body = ''
  const resEnd = res.end.bind(res)

  res.write = data => {
    body += data
  }

  res.end = data => {
    if (
      !(
        res.getHeaders()['cache-control'] &&
        res.getHeaders()['cache-control'].includes('max-age=')
      )
    ) {
      let header = 'max-age=0'
      if (res.getHeaders()['cache-control'])
        header += `, ${res.getHeaders()['cache-control']}`
      res.setHeader('cache-control', header)
    }

    if (data && data.length) body += data
    resEnd(body)
  }

  next()
}
