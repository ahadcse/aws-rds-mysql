const ENVIRONMENT: string = process.env.ENVIRONMENT || 'dev'

import * as SSM from 'aws-sdk/clients/ssm'
import { DBClient } from './dbClient'
import { ListResponse, ResponseFunction } from './typings/responses'

const ssm = new SSM()
let DB: DBClient

const getDBPassword = async () => {
    const { Parameter } = await ssm
        .getParameter({ Name: '/config/reader_password', WithDecryption: true })
        .promise()
    if (!Parameter || !Parameter.Value) {
        throw new Error('No password retrieved from SSM')
    }

    return Parameter.Value
}

const getList = async (priceListId: string): Promise<ListResponse[]> => {
    return DB.getList(priceListId)
}

const getStaticResult = async (): Promise<ListResponse[]> => {
    return DB.getStaticResult()
}

const cleanTables = async () => {
    return Promise.all([
        DB.truncateTable()
    ])
}

const setResponse = (statusCode: number, body: object) => {
    return {
        statusCode,
        body: body || undefined
    }
}

export const handler = async (event: any) => {
    console.log(`event: ${ event }`)

    if(!event.pathParameter.listId) {
        console.log('List Id is not available')
        setResponse(400, { 'message': 'List Id not provided' })
    }
    const {
        listId,
        resourcePath
    } = event
    try {
        DB = new DBClient(await getDBPassword())
        await DB.connect()
    } catch (e) {
        console.error('Cannot connect to DB')
        return setResponse(e.statusCode || 500, e.message || JSON.stringify(e))
    }
    const router: ResponseFunction = {
        '/lists': () => getList(listId),
        '/empty': () => getStaticResult() // For troubleshoot we can set an event with this resourcepath.
    }

    try {
        const response = await (router as any)[resourcePath]()
        await DB.disconnect()
        return setResponse(200, response)
    } catch (e) {
        await DB.disconnect()
        console.error('Error getting response')
        return setResponse(e.statusCode || 500, e.message || e)
    }

}

