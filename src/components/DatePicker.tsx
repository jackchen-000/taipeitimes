"use client";

import { useRouter } from "next/navigation";

export default function DatePicker({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
      <span aria-hidden>📅</span>
      <span className="hidden sm:inline">選擇日期</span>
      <input
        type="date"
        defaultValue={defaultValue}
        onChange={(e) => {
          if (e.target.value) router.push(`/date/${e.target.value}`);
        }}
        className="bg-transparent text-sm text-zinc-900 outline-none dark:text-zinc-100 [color-scheme:light] dark:[color-scheme:dark]"
      />
    </label>
  );
}
