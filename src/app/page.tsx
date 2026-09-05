import { fetchAllSectionsNewsForDate, todayInTaipei } from "@/lib/taipeiTimes";
import NewsBoard from "@/components/NewsBoard";
import DatePicker from "@/components/DatePicker";

export const revalidate = 300;

function todayLabel() {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

export default async function Home() {
  const today = todayInTaipei();
  const sections = await fetchAllSectionsNewsForDate(today);
  const totalCount = sections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Taipei Times 今日新聞總覽
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {todayLabel()} · 共 {totalCount} 則今日新聞 · 資料來源{" "}
              <a
                href="https://www.taipeitimes.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                taipeitimes.com
              </a>
            </p>
          </div>
          <DatePicker defaultValue={today.replace(/\//g, "-")} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <NewsBoard sections={sections} />
      </main>
    </div>
  );
}
