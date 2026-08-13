import Link from "next/link";
import { redirect } from "next/navigation";
import AccountSettings from "@/components/AccountSettings";
import DiaryRings from "@/components/DiaryRings";
import LogoutButton from "@/components/LogoutButton";
import TodayBanner from "@/components/TodayBanner";
import TodoApp from "@/components/TodoApp";
import { getAdminUser } from "@/lib/admin";
import { getCurrentUser } from "@/lib/currentUser";

export default async function Home() {
  // 프록시는 쿠키 서명만 본다. 세션이 30일이라 그 사이 계정이 사라졌을 수 있으므로
  // 실제 사용자인지는 여기서 확인한다.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // 관리 링크는 관리자에게만 보인다. 화면 자체도 따로 확인하므로,
  // 링크가 없다고 접근이 막히는 것은 아니다.
  const isAdmin = (await getAdminUser()) !== null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-8 sm:py-12">
      <div className="diary">
        <DiaryRings />

        <div className="diary-content">
          <header className="mb-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4">
              <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
                <span role="img" aria-label="다이어리">
                  📔
                </span>
                MY TODO
              </h1>
              <div className="flex items-center gap-3">
                <span className="hidden text-sm text-muted sm:inline">
                  {user.username}
                </span>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-sm text-muted underline underline-offset-2 transition-colors hover:text-foreground"
                  >
                    관리
                  </Link>
                )}
                <LogoutButton />
              </div>
            </div>
            <TodayBanner />
          </header>

          <TodoApp />

          <AccountSettings username={user.username} />
        </div>
      </div>
    </main>
  );
}
