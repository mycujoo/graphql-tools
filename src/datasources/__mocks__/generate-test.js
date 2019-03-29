'use strict'

const _ = require('lodash')

function formatArgs(args) {
  return [null, JSON.parse(JSON.stringify(args)), null, null]
}

module.exports = dataSource => {
  const items = [
    {
      text: 'Some text',
      date: 1234567890,
      camelCasedText: 'should work1',
      under_scored_field: 'underscore_01',
      nested: {
        text: 'text1',
        number: 10,
      },
    },
    {
      text: 'Some text',
      date: 1234567891,
      camelCasedText: 'should work2',
      under_scored_field: 'underscore_02',
      nested: {
        text: 'text2',
        number: 9,
      },
    },
    {
      text: 'Some text',
      date: 1234567892,
      camelCasedText: 'should work3',
      under_scored_field: 'underscore_03',
      nested: {
        text: 'text3',
        number: 8,
      },
    },
    {
      text: 'Some text',
      date: 1234567893,
      camelCasedText: 'should work4',
      under_scored_field: 'underscore_04',
      nested: {
        text: 'text4',
        number: 7,
      },
    },
    {
      text: 'Some text',
      date: 1234567894,
      camelCasedText: 'should work5',
      under_scored_field: 'underscore_05',
      nested: {
        text: 'text5',
        number: 6,
      },
    },
    {
      text: 'Some text',
      date: 1234567895,
      camelCasedText: 'should work6',
      under_scored_field: 'underscore_06',
      nested: {
        text: 'text6',
        number: 5,
      },
    },
    {
      text: 'Some text',
      date: 1234567896,
      camelCasedText: 'should work7',
      under_scored_field: 'underscore_07',
      nested: {
        text: 'text7',
        number: 4,
      },
    },
    {
      text: 'Some text',
      date: 1234567897,
      camelCasedText: 'should work8',
      under_scored_field: 'underscore_08',
      nested: {
        text: 'text8',
        number: 3,
      },
    },
    {
      text: 'Some text',
      date: 1234567898,
      camelCasedText: 'should work9',
      under_scored_field: 'underscore_09',
      nested: {
        text: 'text9',
        number: 2,
      },
    },
    {
      text: 'Some text',
      date: 1234567899,
      camelCasedText: 'should work10',
      under_scored_field: 'underscore_10',
      nested: {
        text: 'text10',
        number: 1,
      },
    },
  ]

  let createdItems = []

  describe(`${dataSource._name} DataSource tests`, () => {
    beforeAll(() => {
      return dataSource.connect()
    })

    afterAll(() => {
      return dataSource.disconnect()
    })

    function itemWithoutId(item) {
      return _.omit(item, dataSource._idField)
    }

    function getIdObject(item) {
      return _.pick(item, dataSource._idField)
    }

    test('should create an item', async () => {
      const item = await dataSource.create.apply(
        dataSource,
        formatArgs(items[0]),
      )
      const cleanItem = itemWithoutId(item)
      expect(cleanItem).toEqual(items[0])
      createdItems[0] = item
    })

    test('should findOne an item', async () => {
      const item = await dataSource.findOne.apply(
        dataSource,
        formatArgs(getIdObject(createdItems[0])),
      )
      expect(item).toEqual(createdItems[0])
    })

    test('should create another item', async () => {
      const item = await dataSource.create.apply(
        dataSource,
        formatArgs(items[1]),
      )
      const cleanItem = itemWithoutId(item)
      expect(cleanItem).toEqual(items[1])
      createdItems[1] = item
    })

    test('should findOne another item', async () => {
      const item = await dataSource.findOne.apply(
        dataSource,
        formatArgs(getIdObject(createdItems[1])),
      )
      expect(item).toEqual(createdItems[1])
    })

    test('should create one more item', async () => {
      const item = await dataSource.create.apply(
        dataSource,
        formatArgs(items[2]),
      )
      const cleanItem = itemWithoutId(item)
      expect(cleanItem).toEqual(items[2])
      createdItems[2] = item
    })

    test('should findOne one more item', async () => {
      const item = await dataSource.findOne.apply(
        dataSource,
        formatArgs(getIdObject(createdItems[2])),
      )
      expect(item).toEqual(createdItems[2])
    })

    test('should update an item', async () => {
      const updateDoc = _.merge({ randomField: 'text' }, createdItems[0])
      const item = await dataSource.update.apply(
        dataSource,
        formatArgs(updateDoc),
      )
      expect(item).toEqual(updateDoc)
      createdItems[0] = item
    })

    test('should findOne updated item', async () => {
      const item = await dataSource.findOne.apply(
        dataSource,
        formatArgs(getIdObject(createdItems[0])),
      )
      expect(item).toEqual(createdItems[0])
    })

    test('should update another item', async () => {
      const updateDoc = _.merge(
        { nested: { randomField: 'text' } },
        createdItems[1],
      )

      const item = await dataSource.update.apply(
        dataSource,
        formatArgs(updateDoc),
      )
      expect(item).toEqual(updateDoc)
      createdItems[1] = item
    })

    test('should delete an item', async () => {
      const success = await dataSource.delete.apply(
        dataSource,
        formatArgs(getIdObject(createdItems[2])),
      )
      expect(success).toBe(true)
    })

    test('should not find deleted item', async () => {
      const res = await dataSource.findOne.apply(
        dataSource,
        formatArgs(getIdObject(createdItems[2])),
      )
      expect(res).toBeNull()
      delete createdItems[2]
      createdItems = _.compact(createdItems)
    })

    test('should create a few items', async () => {
      const newItems = await Promise.all(
        _.map(_.range(2, 9), async index => {
          const item = items[index]
          return dataSource.create.apply(dataSource, formatArgs(item))
        }),
      )
      _.each(newItems, item => {
        createdItems.push(item)
      })
    })

    test('should find few items', async () => {
      const query = { text: 'Some text', _sort: ['dateAsc'] }
      const dateSortedItems = _.sortBy(createdItems, 'date')
      const results = await dataSource.find.apply(dataSource, formatArgs(query))
      expect(results.items).toEqual(dateSortedItems)
    })
    test('should find and limit a few items', async () => {
      const fields = [
        'underscore_01',
        'underscore_02',
        'underscore_03',
        'underscore_04',
      ]
      const query = {
        under_scored_field: fields,
        _sort: ['under_scored_fieldAsc'],
        _limit: 2,
      }
      const dateSortedItems = _.take(
        _.sortBy(
          _.filter(createdItems, item => {
            return _.indexOf(fields, item.under_scored_field) !== -1
          }),
          'under_scored_field',
        ),
        2,
      )
      const results = await dataSource.find.apply(dataSource, formatArgs(query))
      expect(results.items).toEqual(dateSortedItems)
    })

    test('should find, limit and sort few items', async () => {
      const fields = ['text1', 'text2', 'text3']
      const query = {
        nested: {
          text: fields,
        },
        _sort: ['dateDsc'],
        _limit: 2,
      }

      const dateSortedItems = _.take(
        _.sortBy(
          _.filter(createdItems, item => {
            return _.indexOf(fields, item.nested.text) !== -1
          }),
          item => {
            return -item.date
          },
        ),
        2,
      )
      const results = await dataSource.find.apply(dataSource, formatArgs(query))
      expect(results.items).toEqual(dateSortedItems)
    })

    test('should find, limit and multi sort few items with a range query', async () => {
      const query = {
        _range_date: {
          gt: 1234567893,
        },
        _sort: ['dateDsc'],
        _limit: 4,
      }

      const dateSortedItems = _.take(
        _.sortBy(
          _.filter(createdItems, item => {
            return item.date > query._range_date.gt
          }),
          item => {
            return -item.date
          },
        ),
        4,
      )
      const results = await dataSource.find.apply(dataSource, formatArgs(query))
      expect(results.items).toEqual(dateSortedItems)
    })
    test('should count a few items with a range query', async () => {
      const query = {
        _range_date: {
          gt: 1234567893,
        },
      }

      const results = await dataSource.count.apply(
        dataSource,
        formatArgs(query),
      )
      expect(results).toEqual(5)
    })
    test('should count a few items with another range query', async () => {
      const query = {
        _range_date: {
          gte: 1234567893,
        },
      }

      const results = await dataSource.count.apply(
        dataSource,
        formatArgs(query),
      )
      expect(results).toEqual(6)
    })
    test('should find, limit and multi sort few items with a range + after query', async () => {
      const query = {
        _range_date: {
          gt: 1234567893,
        },
        _sort: ['dateDsc'],
        _limit: 3,
        _after: 2,
      }

      const dateSortedItems = _.takeRight(
        _.sortBy(
          _.filter(createdItems, item => {
            return item.date > query._range_date.gt
          }),
          item => {
            return -item.date
          },
        ),
        3,
      )
      const results = await dataSource.find.apply(dataSource, formatArgs(query))
      expect(results.items).toEqual(dateSortedItems)
    })
    test('should find, limit and multi sort few items with a range + before query', async () => {
      const query = {
        _range_date: {
          gt: 1234567893,
        },
        _sort: ['dateDsc'],
        _limit: 3,
        _before: 3,
      }

      const dateSortedItems = _.take(
        _.sortBy(
          _.filter(createdItems, item => {
            return item.date > query._range_date.gt
          }),
          item => {
            return -item.date
          },
        ),
        3,
      )
      const results = await dataSource.find.apply(dataSource, formatArgs(query))
      expect(results.items).toEqual(dateSortedItems)
    })

    test('should increment and decrement a value', async () => {
      const args = formatArgs(getIdObject(createdItems[0]))
      args[1].nested = { number: 1 }
      const res = await dataSource.increment.apply(dataSource, args)
      expect(res.nested.number).toEqual(11)
      createdItems[0] = res
      const inc2 = formatArgs(getIdObject(createdItems[0]))
      inc2[1].nested = { number: -2 }
      const res2 = await dataSource.increment.apply(dataSource, inc2)
      expect(res2.nested.number).toEqual(9)
      createdItems[0] = res2
    })
  })
}
