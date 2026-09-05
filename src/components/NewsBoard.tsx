import type { NewsItem, Section } from "@/lib/taipeiTimes";

type SectionResult = {
  section: Section;
  items: NewsItem[];
};

export default function NewsBoard({ sections }: { sections: SectionResult[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
      {sections.map(({ section, items }) => (
        <section
          key={section.slug}
          className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="mb-4 flex items-baseline justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {section.name}
            </h2>
            <span className="text-xs text-zinc-400">{items.length} 則</span>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-zinc-400">當日尚無新聞</p>
          ) : (
            <ol className="space-y-2">
              {items.map((item, index) => (
                <li key={item.id} className="flex gap-2 text-sm">
                  <span className="mt-0.5 shrink-0 text-zinc-400">
                    {index + 1}.
                  </span>
                  <span className="min-w-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-700 hover:text-blue-600 hover:underline dark:text-zinc-300 dark:hover:text-blue-400"
                    >
                      {item.title}
                    </a>
                    {item.page !== null && (
                      <span className="ml-1.5 inline-block rounded bg-zinc-100 px-1.5 py-0.5 align-middle text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        Page {item.page}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}
