export const logGas = async (message: string, tx: Promise<any>, skip?: boolean): Promise<any> => {
    return tx.then(async (result) => {
        const receipt = await result.wait()
        if (!skip) console.log("           Used", receipt.gasUsed.toNumber(), `gas for >${message}<`)
        return result
    })
}