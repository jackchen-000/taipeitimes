"use client";

import { useRouter } from "next/navigation";

export default function DatePicker({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();

  return (
    <label className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 shadow-sm sm:w-auto dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
      <span aria-hidden>📅</span>
      <span className="shrink-0">選擇日期</span>
      <input
        type="date"
        defaultValue={defaultValue}
        onChange={(e) => {
          if (e.target.value) router.push(`/date/${e.target.value}`);
        }}
        className="w-full min-w-0 bg-transparent text-base text-zinc-900 outline-none sm:text-sm dark:text-zinc-100 [color-scheme:light] dark:[color-scheme:dark]"
      />
    </label>
  );
}
