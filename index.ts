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

// Create a mock for the Prisma client
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
                return () => resetMockCalls(mockCache, transactionCache)
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

// Helper function to reset all mock calls - placed at bottom of file
function resetMockCalls(
    mockCache: Map<string, Mock<any>>,
    transactionCache: Map<string, Mock<any>>
) {
    // Reset all mock functions that may be in the mockCache
    mockCache.forEach((value) => {
        // Handle direct mock functions
        if (typeof value === 'function' && value.mock) {
            value.mock.calls = []
        }

        // Try to access model methods if this is a model proxy
        if (value && typeof value === 'object') {
            // Look for known methods like findMany, findUnique, create, etc.
            const commonMethods = [
                'findMany',
                'findUnique',
                'findFirst',
                'create',
                'update',
                'upsert',
                'delete',
                'deleteMany',
                'updateMany',
                'count',
            ]

            // Try accessing these common methods on the model object
            commonMethods.forEach((methodName) => {
                try {
                    const method = (value as any)[methodName]
                    if (method && typeof method === 'function' && method.mock) {
                        method.mock.calls = []
                    }
                } catch (e) {
                    // Ignore errors from proxy handler
                }
            })
        }
    })

    // Do the same for transaction cache
    transactionCache.forEach((value) => {
        if (typeof value === 'function' && value.mock) {
            value.mock.calls = []
        }

        if (value && typeof value === 'object') {
            const commonMethods = [
                'findMany',
                'findUnique',
                'findFirst',
                'create',
                'update',
                'upsert',
                'delete',
                'deleteMany',
                'updateMany',
                'count',
            ]

            commonMethods.forEach((methodName) => {
                try {
                    const method = (value as any)[methodName]
                    if (method && typeof method === 'function' && method.mock) {
                        method.mock.calls = []
                    }
                } catch (e) {
                    // Ignore errors from proxy handler
                }
            })
        }
    })

    // Clear the caches
    mockCache.clear()
    transactionCache.clear()
}
