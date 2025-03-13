import { mock } from 'bun:test'
import type { Mock } from 'bun:test'

/**
 * Recursively transforms a type to create a mock version where all methods
 * are replaced with Bun Mock objects.
 */
type PrismaMethodMock<T> = T extends (...args: any[]) => any
    ? Mock<T>
    : { [K in keyof T]: PrismaMethodMock<T[K]> }

/**
 * Represents a mocked version of the Prisma Client with all methods
 * replaced by Mock objects and additional utility methods.
 */
export type PrismaClientMock<PrismaClient extends object> = {
    [K in keyof PrismaClient]: PrismaMethodMock<PrismaClient[K]>
} & {
    /** Resets all mocks to their initial state */
    _reset: () => void
}

/**
 * Creates a mock instance of the Prisma Client that can be used in tests.
 * All methods are automatically mocked and can be configured with mockResolvedValue, etc.
 *
 * @returns A mock Prisma Client instance
 */
export function createPrismaMock<
    PrismaClient extends object
>(): PrismaClientMock<PrismaClient> {
    // Maps to store our mock structures
    const modelProxies = new Map<string, any>()
    const operationMocks = new Map<string, Mock<any>>()

    // Create a reset function that properly resets all mocks
    const resetFunction = () => {
        // Clear the model proxies to rebuild them if needed
        modelProxies.clear()

        // Reset but don't clear operation mocks to preserve mock functions
        for (const mockFn of operationMocks.values()) {
            mockFn.mockReset()
        }
    }

    // Create the Prisma mock client using a Proxy
    const prismaMockClient = new Proxy({} as any, {
        get: (_target, prop: string) => {
            // Handle special properties
            if (prop === '_reset') {
                return resetFunction
            }

            // Model access (e.g., user, post)
            // Create on demand if not exists
            if (!modelProxies.has(prop)) {
                // Create a model proxy with its operations
                const modelProxy = new Proxy({} as any, {
                    get: (_modelTarget, operation: string) => {
                        const operationKey = `${String(prop)}.${String(
                            operation
                        )}`

                        // Create mock on demand if not exists
                        if (!operationMocks.has(operationKey)) {
                            operationMocks.set(
                                operationKey,
                                mock(() => null)
                            )
                        }

                        return operationMocks.get(operationKey)
                    },
                })

                modelProxies.set(prop, modelProxy)
            }

            return modelProxies.get(prop)
        },
    }) as PrismaClientMock<PrismaClient>

    return prismaMockClient
}

// Export a singleton instance for easy importing in tests
export const prismaMock = createPrismaMock<any>()
