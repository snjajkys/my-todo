import DiaryRings from "@/components/DiaryRings";
import LogoutButton from "@/components/LogoutButton";
import TodayBanner from "@/components/TodayBanner";
import TodoApp from "@/components/TodoApp";

export default function Home() {
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
              <LogoutButton />
            </div>
            <TodayBanner />
          </header>

          <TodoApp />
        </div>
      </div>
    </main>
  );
}
