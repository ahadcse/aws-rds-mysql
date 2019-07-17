const ENVIRONMENT: string = process.env.ENVIRONMENT || 'dev'

import { Connection, createConnection } from 'mysql'
import { ListResponse } from './typings/responses'

export class DBClient {
    private connection: Connection

    constructor(password: string) {
        this.connection = createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password,
            database: process.env.DB_NAME,
            timezone: 'Z'
        })
    }

    public async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.connection.connect((error) => {
                if (error) {
                    console.log('Error connecting to DB', 'dbClient.connect',
                        { error: error.message || JSON.stringify(error) })

                    return reject(`Could not connect to DB: ${ error.code }`)
                }

                console.log('DB connected', 'dbClient.connect')

                return resolve()
            })
        })
    }

    public async disconnect() {
        return this.connection.end()
    }

    private async _query(query: string, params: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.connection.query(query, params, (error, results) => {
                return error ? reject(error) : resolve(results)
            })
        })
    }

    private async _queryWithoutParam(query: string): Promise<any> {
        return new Promise((resolve, reject) => {
            this.connection.query(query, (error, results) => {
                return error ? reject(error) : resolve(results)
            })
        })
    }

    public async getList(listId: string): Promise<ListResponse[]> {
        const query: string = `select * from table1 where attr1=?;`

        const list: ListResponse[] = await this._query(query, [listId])

        if (!list || list.length === 0) {
            console.error(`No list found`, 'dbClient.getList', { listId })
            return Promise.reject({
                statusCode: 404,
                message: `List not found for id: ${ listId }`
            })
        }

        return list
    }

    public async getStaticResult() {
        const query = `select attr1, attr2 from table1`;

        const item = await this._queryWithoutParam(query);

        if (!item || item.length === 0) {
            return Promise.reject({ statusCode: 404, message: `Item not found` });
        }

        return item
    }

    public async truncateTable() {
        const query: string = `truncate table table1`
        await this._query(query, [])
    }

}
