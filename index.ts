import { mock } from 'bun:test'
import type { Mock } from 'bun:test'

type PrismaMethodMock<T> = T extends (...args: any[]) => any
    ? Mock<T>
    : { [K in keyof T]: PrismaMethodMock<T[K]> }

export type PrismaClientMock<PrismaClient extends object> = {
    [K in keyof PrismaClient]: PrismaMethodMock<PrismaClient[K]>
} & {
    $transaction: Mock<
        <T>(
            fn: (tx: PrismaClientMock<PrismaClient>) => Promise<T>
        ) => Promise<T>
    >
    _reset: () => void
}

export function createPrismaMock<
    PrismaClient extends object
>(): PrismaClientMock<PrismaClient> {
    const mockCache = new Map<string, Mock<any>>()
    const transactionCache = new Map<string, Mock<any>>()

    const createModelHandler = (storage: Map<string, Mock<any>>) => ({
        get: (_target: any, prop: string) => {
            if (prop === 'then') return undefined // Important for Promise resolution

            if (!storage.has(prop)) {
                storage.set(
                    prop,
                    mock(() => null)
                )
            }

            return storage.get(prop)
        },
    })

    const createMainHandler = (isTransaction = false) => ({
        get: (_target: any, prop: string) => {
            const storage = isTransaction ? transactionCache : mockCache

            if (prop === '$transaction') {
                return mock(async (fn: any) => {
                    const txMock = new Proxy(
                        {},
                        createMainHandler(true)
                    ) as PrismaClientMock<PrismaClient>
                    return fn(txMock)
                })
            }

            if (prop === '_reset') {
                return () => {
                    mockCache.clear()
                    transactionCache.clear()
                }
            }

            if (!storage.has(prop)) {
                storage.set(prop, new Proxy({}, createModelHandler(storage)))
            }

            return storage.get(prop)
        },
    })

    return new Proxy({}, createMainHandler()) as PrismaClientMock<PrismaClient>
}

// Singleton instance
export const prismaMock = createPrismaMock<any>()
