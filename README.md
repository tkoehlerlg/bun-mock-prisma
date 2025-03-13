# bun-mock-prisma

A simple and type-safe mocking utility for Prisma Client in Bun tests.

![Bun Compatible](https://img.shields.io/badge/Bun-Compatible-brightgreen.svg)
![license](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

-   🔒 Fully type-safe mocking of Prisma Client
-   🔄 Support for nested models and methods
-   🧹 Simple reset mechanism for test isolation
-   🪲 Handles edge cases gracefully
-   🚀 Zero dependencies - only requires Bun

## Installation

```bash
# Install as a dev dependency
bun add -d bun-mock-prisma
```

## Basic Usage

### Setting Up the Mock

Create a singleton file for your Prisma mock:

```typescript
// prisma.singleton.ts
import { mock } from 'bun:test'
import { PrismaClient } from '@prisma/client'
import { createPrismaMock } from 'bun-mock-prisma'
import type { PrismaClientMock } from 'bun-mock-prisma'
import { prisma } from '@/utils/prisma'

// Mock the module that exports your Prisma client
mock.module('@/utils/prisma', () => ({
    __esModule: true,
    prisma: createPrismaMock<PrismaClient>(),
}))

// Export the mocked client for use in tests
export const prismaMock = prisma as unknown as PrismaClientMock<PrismaClient>
```

### Writing Tests

```typescript
// user.test.ts
import { describe, test, expect } from 'bun:test'
import { prismaMock } from './prisma.singleton'
import { createUser } from './user.service'

// Reset mocks before each test
beforeEach(() => {
    prismaMock._reset()
})

describe('User service', () => {
    test('should create a new user', async () => {
        // Setup mock return value
        prismaMock.user.create.mockResolvedValue({
            id: '1',
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
        expect(user.id).toBe('1')
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

## Publishing Your Own Version

To publish this package to the Bun registry:

```bash
# Login to Bun registry
bun login

# Build the package
bun run build

# Publish to Bun registry
bun publish
```

## Advanced Usage

### Testing with Relationships

```typescript
test('should find posts with their author', async () => {
    // Setup mock return value for posts with included author
    prismaMock.post.findMany.mockResolvedValue([
        {
            id: '1',
            title: 'Test Post',
            content: 'This is a test post',
            authorId: '1',
            author: {
                id: '1',
                name: 'Test User',
                email: 'test@example.com',
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        },
    ])

    // Call the service that uses prisma
    const posts = await getPosts()

    // Verify results
    expect(posts).toHaveLength(1)
    expect(posts[0].title).toBe('Test Post')
    expect(posts[0].author.name).toBe('Test User')

    // Verify mock was called correctly
    expect(prismaMock.post.findMany).toHaveBeenCalledWith({
        include: { author: true },
    })
})
```

### Testing Error Handling

```typescript
test('should handle database errors', async () => {
    // Setup mock to throw an error
    prismaMock.user.create.mockRejectedValue(
        new Error('Unique constraint violation')
    )

    // Call the service and expect it to throw
    await expect(
        createUser({ name: 'Test', email: 'existing@example.com' })
    ).rejects.toThrow('Unique constraint violation')
})
```

### Testing Code with Transactions

When testing code that uses Prisma transactions, we recommend focusing on testing the individual operations rather than the transaction mechanism itself:

```typescript
// Service with transaction
class UserService {
    // Method that can be tested directly
    async createUserWithPost(client, userData, postData) {
        const user = await client.user.create({ data: userData })
        const post = await client.post.create({
            data: { ...postData, authorId: user.id },
        })
        return { user, post }
    }

    // Method that uses transaction - not tested directly
    async createUserWithPostTransaction(userData, postData) {
        return prisma.$transaction((tx) =>
            this.createUserWithPost(tx, userData, postData)
        )
    }
}

// Test
test('should create user and post correctly', async () => {
    const service = new UserService()

    // Setup mocks
    prismaMock.user.create.mockResolvedValue({
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
    })

    prismaMock.post.create.mockResolvedValue({
        id: '1',
        title: 'Test Post',
        content: 'This is a test post',
        authorId: '1',
    })

    // Test the implementation directly with the mock client
    const result = await service.createUserWithPost(
        prismaMock,
        { name: 'Test User', email: 'test@example.com' },
        { title: 'Test Post', content: 'This is a test post' }
    )

    // Verify results
    expect(result.user).toBeTruthy()
    expect(result.post).toBeTruthy()

    // Verify mocks were called
    expect(prismaMock.user.create).toHaveBeenCalled()
    expect(prismaMock.post.create).toHaveBeenCalled()
})
```

## Handling Edge Cases

### Working with Multiple Mocks in Sequence

When setting up multiple mocks that will be called sequentially, be aware that in some cases mocks may interfere with each other. Use more specific assertions instead of direct object equality:

```typescript
// Instead of this:
expect(result.user).toEqual(mockUser)

// Use individual property checks:
expect(result.user.id).toBe('1')
expect(result.user.name).toBe('Test User')

// Or check for existence:
expect(result.user).toBeTruthy()
expect(result.user.id).toBeTruthy()
```

### Complex Query Parameters

The mocking system preserves complex query parameters so you can verify them:

```typescript
prismaMock.user.findMany.mockResolvedValue([
    /* results */
])

await prisma.user.findMany({
    where: {
        OR: [
            { name: { contains: 'User' } },
            { email: { endsWith: '@example.com' } },
        ],
        AND: [{ active: true }],
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    skip: 5,
})

expect(prismaMock.user.findMany).toHaveBeenCalledWith({
    where: {
        OR: [
            { name: { contains: 'User' } },
            { email: { endsWith: '@example.com' } },
        ],
        AND: [{ active: true }],
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    skip: 5,
})
```

## API Reference

### `createPrismaMock<PrismaClient>()`

Creates a mock instance that mimics the structure of your Prisma Client.

### `PrismaClientMock<PrismaClient>`

A type that represents the mocked Prisma Client, with all methods converted to Bun's Mock objects.

### Mock Instance Methods

-   `_reset()`: Resets all mocks. Call this in `beforeEach` to ensure test isolation.

## FAQ

### Do I need to run anything like `jest.mock()` before my tests like in Jest?

No, you don't. Bun's mocking system works differently from Jest's. When you call `mock.module()` in your singleton file, it automatically applies the mock for all tests that import that module.

### Do I need to configure `setupFilesAfterEnv` or something similar?

No. Just import your singleton file that contains the mock setup at the top of your test files, and everything will work automatically.

### How do I handle mocking transactions?

We recommend testing the individual operations rather than the transaction mechanism. Separating your business logic from the transaction mechanism makes testing easier.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
