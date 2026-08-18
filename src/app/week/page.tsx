import { redirect } from "next/navigation";
import AdminSessionKeepalive from "@/components/AdminSessionKeepalive";
import DiaryRings from "@/components/DiaryRings";
import LogoutButton from "@/components/LogoutButton";
import ViewTabs from "@/components/ViewTabs";
import WeekView from "@/components/WeekView";
import { getAdminUser } from "@/lib/admin";
import { getCurrentUser } from "@/lib/currentUser";

export default async function WeekPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // 관리자 세션은 짧고 요청이 올 때마다 늘어난다.
  // 이 화면에 오래 머물러도 로그인이 풀리지 않도록 여기서도 붙여 둔다.
  const isAdmin = (await getAdminUser()) !== null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-8 sm:py-12">
      {isAdmin && <AdminSessionKeepalive />}

      <div className="diary">
        <DiaryRings />

        <div className="diary-content">
          <header className="mb-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight sm:text-4xl">
                <span role="img" aria-label="주간">
                  📅
                </span>
                주간 할 일
              </h1>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-border bg-card px-3 py-1 text-sm font-semibold text-ink-text">
                  {user.username}
                </span>
                <LogoutButton />
              </div>
            </div>

            <ViewTabs current="week" />
          </header>

          <WeekView />
        </div>
      </div>
    </main>
  );
}
