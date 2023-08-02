export type Results = {
    title: string,
    location: string,
    data?: Buffer, 
    metadata: {
        width: number,
        height: number,
    }
}
