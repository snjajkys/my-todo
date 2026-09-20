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
              {/* ml-auto 는 좁은 화면 때문이다. 이 묶음이 제목 아래로 밀려 내려가면
                  바로 밑의 화면 이동 단추와 세로로 겹쳐, 달력을 누르려다 로그아웃이
                  눌리는 일이 있었다. 단추들은 왼쪽에서 시작하므로 이 묶음을 오른쪽
                  끝으로 보내면 자리가 갈린다. 한 줄에 다 들어가는 넓은 화면에서는
                  justify-between 이 이미 하던 일이라 보이는 결과가 달라지지 않는다. */}
              <div className="ml-auto flex items-center gap-3">
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
