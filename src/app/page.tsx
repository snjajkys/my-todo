import { redirect } from "next/navigation";
import ChangePassword from "@/components/ChangePassword";
import DeleteAccount from "@/components/DeleteAccount";
import DiaryRings from "@/components/DiaryRings";
import LogoutButton from "@/components/LogoutButton";
import TodayBanner from "@/components/TodayBanner";
import TodoApp from "@/components/TodoApp";
import { getCurrentUser } from "@/lib/currentUser";

export default async function Home() {
  // 프록시는 쿠키 서명만 본다. 세션이 30일이라 그 사이 계정이 사라졌을 수 있으므로
  // 실제 사용자인지는 여기서 확인한다.
  const user = await getCurrentUser();
  if (!user) redirect("/login");

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
                <LogoutButton />
              </div>
            </div>
            <TodayBanner />
          </header>

          <TodoApp />

          <ChangePassword />
          <DeleteAccount username={user.username} />
        </div>
      </div>
    </main>
  );
}
