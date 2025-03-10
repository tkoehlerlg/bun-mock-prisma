# bun-mock-prisma

A simple and type-safe mocking utility for Prisma Client in Bun tests.

## Installation

```bash
bun add -d bun-mock-prisma
```

## Features

-   Fully type-safe mocking of Prisma Client
-   Support for nested models and methods
-   Support for transactions
-   Simple reset mechanism for test isolation
-   No dependencies apart from Bun and TypeScript

## Usage

### Basic Setup

Create a singleton file for your Prisma mock:

```typescript
// prisma.singleton.ts
import { PrismaClient } from '@prisma/client'
import { mock, beforeEach } from 'bun:test'
import { createPrismaMock } from 'bun-mock-prisma'
import type { PrismaClientMock } from 'bun-mock-prisma'
import { prisma } from '@/utils/prisma'

mock.module('@/utils/prisma', () => ({
    __esModule: true,
    prisma: createPrismaMock<PrismaClient>(),
}))

beforeEach(() => {
    prismaMock._reset()
})

export const prismaMock = prisma as unknown as PrismaClientMock<PrismaClient>
```

### Using in Tests

```typescript
// user.test.ts
import { describe, test, expect } from 'bun:test'
import { prismaMock } from './prisma.singleton'
import { createUser } from './user.service'

describe('User service', () => {
    test('should create a new user', async () => {
        // Setup mock return value
        prismaMock.user.create.mockResolvedValue({
            id: 1,
            name: 'Test User',
            email: 'test@example.com',
            createdAt: new Date(),
        })

        // Call the service that uses prisma
        const user = await createUser({
            name: 'Test User',
            email: 'test@example.com',
        })

        // Verify results
        expect(user.id).toBe(1)
        expect(user.name).toBe('Test User')

        // Verify mock was called correctly
        expect(prismaMock.user.create).toHaveBeenCalledWith({
            data: {
                name: 'Test User',
                email: 'test@example.com',
            },
        })
    })
})
```

### Mocking Transactions

```typescript
import { prismaMock } from './prisma.singleton'

test('should handle transactions', async () => {
    // Mock user creation in transaction
    prismaMock.$transaction.mockImplementation(async (callback) => {
        // Create a transaction context
        const txPrisma = prismaMock

        // Set up mock for methods used in transaction
        txPrisma.user.create.mockResolvedValue({
            id: 1,
            name: 'Transaction User',
            email: 'tx@example.com',
            createdAt: new Date(),
        })

        // Execute the callback with our mocked transaction context
        return callback(txPrisma)
    })

    // Call service method that uses transactions
    // ...
})
```

## Q&A

### Do I need to run anything like `jest.mock()` before my tests like in Jest?

No, you don't. Bun's mocking system works differently from Jest's. When you call `mock.module()` in your singleton file, it automatically applies the mock for all tests that import that module. There's no need for hoisting or manually running any setup functions before your tests.

### Do I need to configure `setupFilesAfterEnv` or something similar?

No. Unlike Jest, Bun doesn't require you to configure any special setup files like `setupFilesAfterEnv`. Just import your singleton file that contains the mock setup at the top of your test files, and everything will work automatically. There's no need for additional configuration in a separate Jest-like config file.

## API

### `createPrismaMock<PrismaClient>()`

Creates a mock instance that mimics the structure of your Prisma Client.

### `PrismaClientMock<PrismaClient>`

A type that represents the mocked Prisma Client, with all methods converted to Bun's Mock objects.

### Mock Instance Methods

-   `_reset()`: Resets all mocks. Call this in `beforeEach` to ensure test isolation.
-   `$transaction`: Mock for Prisma's transaction method.

## License

MIT
