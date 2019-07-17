const { SQS_URL } = process.env

import { UpdateListData } from './typings'
import { deleteSQSMessage } from './sqsClient'
import { insertListData } from './repository'

import * as mysql from 'mysql'

export const handler = async (event: any): Promise<mysql.Query> => {
    const record = event.Records[0]
    const body: UpdateListData = JSON.parse(record.body)
    const receiptHandle = record.receiptHandle
    try {
        const res = await insertListData(body)
        if (res.processed === false) {
            console.log(res.message, 'handler.try.skipped', { body })
            return res.message
        }
        console.log(`Insert successful`, 'handler.try.success', { body })
        await deleteSQSMessage(SQS_URL, receiptHandle)
        return res
    } catch (error) {
        console.log(`Insert failed`, 'handler.try.catch', { body })
        throw error
    }
}
