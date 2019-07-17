// @ts-ignore
import {
    insertList,
    clearTables
} from '../../helper/databaseHelper'

import * as moment from 'moment'

const populateDatabaseWithValidData = () => Promise.all([
    insertList()
])

jest.setTimeout(10000)

describe('getPrices', () => {
    beforeEach(async () => {
        process.env.MYSQL_ROOT_PASSWORD = 'root_password'
        process.env.CIUPDATER_PASSWORD = 'updater_pass'
        process.env.AWS_REGION = 'ue-test-1'
        process.env.DB_HOST = '127.0.0.1'
        process.env.DB_USER = 'reader'
        process.env.DB_NAME = 'lists'

        jest.resetModules()

        let mockGetParameter: any

        jest.mock('../../../src/getList/node_modules/aws-sdk/clients/ssm', () => {
            mockGetParameter = jest.fn().mockImplementation((params) => {
                return {
                    promise: jest.fn().mockResolvedValue({ Parameter: { Value: 'update_pass' } })
                }
            })

            return function SSM() {
                return { getParameter: mockGetParameter }
            }
        })

        try {
            await clearTables()
            await populateDatabaseWithValidData()
        } catch (error) {
            throw error
        }
    })

    afterAll(async () => {
        await clearTables()
    })

    describe('happy case', () => {
        test('getList happy case', async () => {
            const { handler } = require('../../../src/getList')
            const eventRequest = require('../../data/getList/happyCase.json')
            const listDatabase = require('../../data/insert/insertListData.json')

            const res = await handler(eventRequest)
            const body = JSON.parse(res.body)

            expect(body[0].attr1).toBe('value1')
        })
    })
})
