import { mock } from 'bun:test'
import { PrismaClient } from '@prisma/client'
import { createPrismaMock } from 'bun-mock-prisma'
import type { PrismaClientMock } from 'bun-mock-prisma'
import { prisma } from './prisma.utils'

mock.module('./prisma.utils', () => ({
    __esModule: true,
    prisma: createPrismaMock<PrismaClient>(),
}))

export const prismaMock = prisma as unknown as PrismaClientMock<PrismaClient>
