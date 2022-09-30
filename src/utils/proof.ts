import { ethers, BigNumber } from "ethers"

export const EMPTY_HASH = ethers.utils.keccak256(ethers.utils.hexlify("0x"))

const combineAndHash = (leaf1: string, leaf2: string): string => {
    const combined = ethers.utils.defaultAbiCoder.encode(["bytes32", "bytes32"], [leaf1, leaf2])
    return ethers.utils.keccak256(combined)
}

const generate = (input: string[], element?: string): { root: string, proof: string[] } => {
    const proof = []
    const elements = [...input]
    let count = elements.length
    while (count > 1) {
        for (let i = 0; i < count; i += 2) {
            const leaf1 = elements[i]
            const leaf2 = i + 1 >= count ? EMPTY_HASH : elements[i + 1]
            if (leaf1 === element) {
                proof.push(leaf2)
                elements[i / 2] = element
            } else if (leaf2 === element) {
                proof.push(leaf1)
                elements[i / 2] = element
            } else {
                if (BigNumber.from(leaf1).lt(BigNumber.from(leaf2))) {
                    elements[i / 2] = combineAndHash(leaf1, leaf2)
                } else {
                    elements[i / 2] = combineAndHash(leaf2, leaf1)
                }
            }
        }
        count = Math.ceil(count / 2)
    }
    return { proof, root: elements[0] }
}

export const generateRoot = (elements: string[]): string => {
    const { root } = generate(elements)
    return root
}

export const generateProof = (elements: string[], element: string): string[] => {
    const { proof } = generate(elements, element)
    return proof
}

export const generateFullTree = (elements: string[]): string[][] => {
    let count = elements.length
    let level = 0
    let previousLevel = elements
    const levels: string[][] = []
    levels[level] = previousLevel
    while (count > 1) {
        const currentLevel: string[] = []
        for (let i = 0; i < count; i += 2) {
            const leaf1 = previousLevel[i]
            const leaf2 = i + 1 >= count ? EMPTY_HASH : previousLevel[i + 1]
            if (BigNumber.from(leaf1).lt(BigNumber.from(leaf2))) {
                currentLevel[i / 2] = combineAndHash(leaf1, leaf2)
            } else {
                currentLevel[i / 2] = combineAndHash(leaf2, leaf1)
            }
        }
        count = Math.ceil(count / 2)
        previousLevel = currentLevel
        level++
        levels[level] = previousLevel
    }
    return levels
}

export const extractProof = (element: string, fullTree: string[][]): string[] => {
    const proof: string[] = []
    let currentLevelIndex = 0
    let elementIndex = fullTree[currentLevelIndex].indexOf(element)
    if (elementIndex < 0) throw Error("Element not found!")
    const levelCount = fullTree.length
    while (currentLevelIndex < levelCount - 1) {
        const currentLevel = fullTree[currentLevelIndex]
        if (elementIndex % 2 === 0) {
            if (elementIndex + 1 >= currentLevel.length)
                proof.push(EMPTY_HASH)
            else
                proof.push(currentLevel[elementIndex + 1])
        } else {
            proof.push(currentLevel[elementIndex - 1])
        }
        elementIndex = Math.floor(elementIndex / 2)
        currentLevelIndex++
    }
    return proof
}