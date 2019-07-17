import * as SQS from 'aws-sdk/clients/sqs'
const sqs = new SQS()

export const deleteSQSMessage = async (QueueUrl: string = '', receiptHandle: string) => sqs.deleteMessage({
    QueueUrl,
    ReceiptHandle: receiptHandle
}).promise()
