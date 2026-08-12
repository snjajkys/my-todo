import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

// 개발 모드에서 HMR로 인해 PrismaClient 인스턴스가 계속 늘어나는 것을 막기 위해
// globalThis에 캐싱한다.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Vercel 서버리스는 요청이 몰리면 인스턴스가 수십 개까지 늘어난다.
    // 인스턴스당 커넥션을 1개로 묶어야 Supabase pooler 한도를 넘지 않는다.
    max: process.env.NODE_ENV === 'production' ? 1 : 5,
  })

  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
