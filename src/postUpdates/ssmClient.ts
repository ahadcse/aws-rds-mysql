const { AWS_REGION } = process.env

import * as SSM from 'aws-sdk/clients/ssm'

const ssm = new SSM({ region: AWS_REGION })

export const getSsmValue = async (name: string): Promise<string> => {
    const res: SSM.Types.GetParameterResult = await ssm.getParameter({
        Name: name,
        WithDecryption: true
    }).promise()

    // @ts-ignore
    return res.Parameter.Value
}
