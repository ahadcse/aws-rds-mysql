export type ListResponse = {
    attr1: string,
    attr2: string
}

export interface ResponseFunction {
    [key: string]: CallableFunction
}
