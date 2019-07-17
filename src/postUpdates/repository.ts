const { DB_HOST, SSMKEY = '' } = process.env

import * as mysql from 'mysql'
import { UpdateListData } from './typings'
import { getSsmValue } from './ssmClient'


const makeDbClient = async () => mysql.createConnection({
    host: DB_HOST,
    user: 'updater',
    database: 'lists',
    password: await getSsmValue(SSMKEY),
    port: 3306,
    timezone: 'Z'
})

const makeDBRequest = async (query: string, values: any[]): Promise<any> => {
    const connection = await makeDbClient()

    return new Promise((resolve, reject) => {
        connection.connect((error) => {
            if(error) {
                console.log('DB connection error', error.message || JSON.stringify(error))
                return reject(error)
            }

            connection.query(query, values, (queryError, results, fields) => {
                if(queryError) {
                    console.log('Error making database query', queryError)
                    connection.end()
                    return reject(queryError)
                }
                connection.end((endFromSecondEnd) => {
                    if(endFromSecondEnd) {
                        console.log('endFromSecondEnd', endFromSecondEnd)
                        return reject(endFromSecondEnd)
                    }
                })

                return  resolve(results)
            })
        })
    })
}

export const insertListData = async (body: UpdateListData) => {
    const query: string = `INSERT INTO TABLE1 (
        ATTR1,
        ATTR2
    )
    VALUES (?, ?)` // Corner cases not covered. For example, duplicate keys

    const values = [
        body.att1,
        body.att2
    ]

    return makeDBRequest(query, values)
}


