import { notFound } from "next/navigation";
import { fetchAllSectionsNewsForDate, parseDateParam } from "@/lib/taipeiTimes";
import NewsBoard from "@/components/NewsBoard";
import DatePicker from "@/components/DatePicker";

function dateLabel(isoDate: string) {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(`${isoDate}T12:00:00+08:00`));
}

export default async function DatePage(props: PageProps<"/date/[date]">) {
  const { date: rawDate } = await props.params;
  const date = parseDateParam(rawDate);
  if (!date) notFound();

  const isoDate = date.replace(/\//g, "-");
  const sections = await fetchAllSectionsNewsForDate(date);
  const totalCount = sections.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
              Taipei Times 新聞總覽
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {dateLabel(isoDate)} · 共 {totalCount} 則新聞 · 資料來源{" "}
              <a
                href="https://www.taipeitimes.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                taipeitimes.com
              </a>
              {" · "}
              <a
                href="/"
                className="underline decoration-dotted underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-200"
              >
                回今日新聞
              </a>
            </p>
          </div>
          <DatePicker defaultValue={isoDate} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <NewsBoard sections={sections} />
      </main>
    </div>
  );
}
