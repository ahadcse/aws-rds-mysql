import * as mysql from 'mysql'
import * as SSM from 'aws-sdk/clients/ssm'

// @ts-ignore
import * as insertListData from '../data/insert/insertListData.json'

const ssm = new SSM({ region: 'eu-west-1' })

export const insertList = async () => {
    for (const record of insertListData) {
        const query = `INSERT INTO table1(
      attr1,
      attr2
     ) VALUES(?, ?)`

        const values = [
            record.attr1,
            record.attr2
        ]

        await runDbQuery(query, values)
    }
}

export const emptyTable = () => runDbQuery('DELETE FROM table1')

export const clearTables = () => Promise.all([
    emptyTable(),
])

const runDbQuery = (query: string, values?: any[]): Promise<any> => new Promise((resolve, reject) => {
    const connection = mysql.createConnection({
        host: process.env.DB_HOST,
        user: 'root',
        database: 'lists',
        password: process.env.MYSQL_ROOT_PASSWORD,
        port: 3306,
        timezone: 'Z'
    })

    connection.connect((error) => {
        if (error) {
            console.log('connection error')
            reject(error)
        }

        connection.query(query, values, (queryError, results, fields) => {
            if (queryError) {
                console.log('query error')
                connection.end()
                reject(queryError)
            }

            connection.end((err) => {
                if (err) {
                    console.log('Close connection error')
                    reject(err)
                }
                resolve(results)
            })
        })
    })
})

export const getSSMValue = (Name: string): Promise<SSM.Types.GetParameterResult> => ssm.getParameter({
    Name,
    WithDecryption: true
}).promise()

