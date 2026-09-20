import { promises as dns } from 'node:dns'
import { isIP } from 'node:net'
import { Client, Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'
// import 에 .ts 를 붙여 둔다. 테스트는 node 가 이 파일을 직접 읽어 들이는데,
// 확장자가 없으면 node 가 경로를 풀지 못해 테스트 전체가 못 돈다 (빌드는 둘 다 된다).
import { SUPABASE_ROOT_CA } from './supabaseCa.ts'

// 개발 모드에서 HMR로 인해 PrismaClient 인스턴스가 계속 늘어나는 것을 막기 위해
// globalThis에 캐싱한다.
const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined
}

/* ------------------------------------------------------------------ *
 * 어느 풀러 노드에 붙을지 고르기
 *
 * Supabase 풀러(`*.pooler.supabase.com`)는 주소 하나 뒤에 노드가 여러 대 있다.
 * 그중 한 대가 죽으면 TCP 는 멀쩡히 열리는데 Postgres 응답이 영영 오지 않는다.
 * 2026-08-24 ap-northeast-2 장애가 정확히 이랬다 — 세 대 중 한 대가 이 상태였고,
 * 접속 세 번 중 한 번이 25초를 매달리다 죽었다.
 *
 * 다시 시도하는 것만으로는 부족하다. 이름 풀이 결과는 OS 가 캐시해 두는 일이 잦아,
 * 죽은 노드를 한 번 잡으면 재시도도 같은 노드로 다시 간다(실제로 확인했다).
 * 그래서 붙을 노드를 여기서 직접 고른다.
 * ------------------------------------------------------------------ */

/** 이름 풀이 결과를 들고 있는 시간. 접속마다 조회하지 않기 위해서. */
const DNS_TTL_MS = 30_000

/** 접속에 실패한 노드를 건너뛰는 시간. */
const COOLDOWN_MS = 60_000

const addressCache = new Map<string, { at: number; addresses: string[] }>()
const failedAt = new Map<string, number>()

async function addressesOf(host: string): Promise<string[]> {
  const cached = addressCache.get(host)
  if (cached && Date.now() - cached.at < DNS_TTL_MS) return cached.addresses

  try {
    const addresses = await dns.resolve4(host)
    addressCache.set(host, { at: Date.now(), addresses })
    return addresses
  } catch {
    // 이름을 못 풀면 고르지 않는다. pg 가 평소대로 하게 둔다.
    return []
  }
}

/**
 * 붙을 노드 하나. 최근에 실패한 노드는 건너뛴다.
 * 고를 이유가 없으면(주소가 하나뿐이거나 이미 IP거나) null 을 준다.
 */
async function pickAddress(host: string | undefined): Promise<string | null> {
  if (!host || isIP(host)) return null

  const addresses = await addressesOf(host)
  if (addresses.length < 2) return null

  const now = Date.now()
  const healthy = addresses.filter(
    (ip) => now - (failedAt.get(ip) ?? 0) > COOLDOWN_MS
  )

  // 전부 최근에 실패했다면 그래도 하나는 골라야 한다. 그새 살아났을 수 있다.
  const candidates = healthy.length > 0 ? healthy : addresses

  return candidates[Math.floor(Math.random() * candidates.length)]
}

/* ------------------------------------------------------------------ *
 * 접속을 TLS 로 감싸기
 *
 * 이걸 넣기 전까지 앱은 Supabase 에 평문으로 붙고 있었다. 접속 문자열에
 * `sslmode` 가 없으면 pg 는 암호화 없이 붙는데, 그러면 비밀번호 해시를 포함한
 * 모든 데이터가 Vercel 과 Supabase 사이를 그대로 흘러간다.
 * ------------------------------------------------------------------ */

function hostOf(connectionString: string | undefined): string | null {
  if (!connectionString) return null

  try {
    return new URL(connectionString).hostname
  } catch {
    return null
  }
}

/**
 * Supabase 로 붙을 때 쓸 TLS 설정. 다른 곳(로컬 Postgres 등)이면 건드리지 않는다.
 *
 * `servername` 을 직접 박는 것이 요점이다. 위에서 붙을 노드를 IP 로 갈아 끼우는데,
 * pg 는 호스트가 IP 면 SNI 를 넣지 않는다(`connection.js` 의 `net.isIP` 분기).
 * 그대로 두면 인증서 이름 확인이 엉뚱한 값으로 떨어져 검증이 깨진다.
 * 원래 호스트 이름을 여기에 못 박아 두면 IP 로 붙어도 검증이 그대로 산다.
 *
 * Supabase 풀러는 공인 CA 가 아니라 자체 루트로 서명한 인증서를 내민다.
 * 그래서 시스템 신뢰 목록이 아니라 `SUPABASE_ROOT_CA` 로 확인한다.
 */
function sslFor(connectionString: string | undefined) {
  const host = hostOf(connectionString)
  if (!host || !/\.supabase\.(com|co)$/.test(host)) return false

  return {
    ca: SUPABASE_ROOT_CA,
    rejectUnauthorized: true,
    servername: host,
  }
}

type ConnectCallback =
  | ((error: Error) => void)
  | ((error: null, client: Client) => void)

/**
 * 접속 직전에 붙을 노드를 정하고, 실패한 노드를 기억해 두는 pg 클라이언트.
 * pg 는 생성자에서 `connectionParameters.host` 를 `this.host` 로 복사해 두고
 * 접속할 때 그 값을 쓰므로, 여기서 `this.host` 를 갈아 끼우면 된다.
 */
class BalancedClient extends Client {
  connect(): Promise<Client>
  connect(callback: ConnectCallback): void
  connect(callback?: ConnectCallback): Promise<Client> | void {
    const self = this as unknown as { host?: string }

    const attempt = (async () => {
      const address = await pickAddress(self.host)
      if (address) self.host = address

      try {
        return (await super.connect()) as unknown as Client
      } catch (error) {
        if (address) failedAt.set(address, Date.now())
        throw error
      }
    })()

    if (!callback) return attempt

    attempt.then(
      (client) => (callback as (error: null, client: Client) => void)(null, client),
      (error: Error) => (callback as (error: Error) => void)(error)
    )
  }
}

/* ------------------------------------------------------------------ *
 * 접속 실패 다시 시도하기
 * ------------------------------------------------------------------ */

/**
 * 접속을 포기하기까지 기다리는 시간. 죽은 노드에 25초를 매달리는 대신
 * 짧게 끊고 다른 노드로 다시 붙는 편이 낫다.
 */
const CONNECT_TIMEOUT_MS = 4000

/** 처음 시도를 포함한 횟수. 최악이라도 4s + 0.2s + 4s + 0.5s + 4s ≈ 13초. */
const MAX_ATTEMPTS = 3

/** 다시 시도하기 전 대기. */
const BACKOFF_MS = [200, 500]

/**
 * 다시 시도해도 되는 실패의 표식.
 *
 * **접속 단계에서 끝난 실패만 넣는다.** 질의가 DB 에 닿기 전에 끊긴 것이므로
 * 다시 보내도 같은 일이 두 번 일어나지 않는다. 반대로 질의를 보낸 뒤 끊긴
 * 실패(`ECONNRESET` 등)는 서버가 이미 처리했는지 알 수 없어서 넣지 않는다.
 * 할 일이 두 개 생기는 것보다 오류 한 번이 낫다.
 *
 * `ENOTFOUND`(tenant/user not found)도 뺐다. 접속 문자열이 틀렸다는 뜻이라
 * 몇 번을 다시 해도 결과가 같고, 잘못된 설정을 늦게 알아차리게만 만든다.
 */
const RETRYABLE = [
  'timeout expired', // pg 풀에서 커넥션을 못 받음 (CONNECT_TIMEOUT_MS 초과)
  'Connection terminated due to connection timeout',
  'ECHECKOUTTIMEOUT', // Supavisor 자신의 풀이 꽉 참
  'EAUTHQUERY', // Supavisor 가 Postgres 에 인증 질의를 못 함
  'ECONNREFUSED',
  'ETIMEDOUT',
]

/** Prisma 는 드라이버 오류를 제 오류로 감싸므로 `cause` 를 타고 내려간다. */
function isRetryable(error: unknown): boolean {
  let current: unknown = error

  for (let depth = 0; current && depth < 5; depth++) {
    const { code, message } = current as { code?: unknown; message?: unknown }
    const text = [code, message].filter((v) => typeof v === 'string').join(' ')

    if (RETRYABLE.some((sign) => text.includes(sign))) return true

    current = (current as { cause?: unknown }).cause
  }

  return false
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run()
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS || !isRetryable(error)) throw error

      await wait(BACKOFF_MS[attempt - 1])
    }
  }
}

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Vercel 서버리스는 요청이 몰리면 인스턴스가 수십 개까지 늘어난다.
    // 인스턴스당 커넥션을 1개로 묶어야 Supabase pooler 한도를 넘지 않는다.
    max: process.env.NODE_ENV === 'production' ? 1 : 5,
    connectionTimeoutMillis: CONNECT_TIMEOUT_MS,
    Client: BalancedClient,
    ssl: sslFor(process.env.DATABASE_URL),
  })

  return new PrismaClient({ adapter: new PrismaPg(pool) }).$extends({
    name: 'retry-on-connect-failure',
    query: {
      $allOperations: ({ query, args }) => withRetry(() => query(args)),
    },
  })
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>

export const prisma: ExtendedPrismaClient =
  globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
