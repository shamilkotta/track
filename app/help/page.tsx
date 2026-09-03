import Link from "nlite/link";
import { BrandMark } from "@/components/brand-mark";

export const rendering = "force-ssr";

const shortcuts = [
  { keys: "⌘K", action: "Open search" },
  { keys: "Click a row", action: "Open application details" },
  { keys: "Filters", action: "Narrow by priority, reply, work mode, and source" },
  { keys: "Saved views", action: "Store the current search, filters, sort, and year" },
];

const topics = [
  {
    title: "Applications",
    body: "Create an entry with company, role, and resume. Status, priority, and reply update immediately. Save writes the rest of the form.",
  },
  {
    title: "Library",
    body: "Companies, resumes, and cover letters are reused across applications. Upload files from the library or from the application form.",
  },
  {
    title: "Archive",
    body: "Rejected and withdrawn roles move here automatically. You can also archive a selection from the table, then restore it later.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-6 py-10 md:px-8">
      <header className="mb-10">
        <BrandMark href="/applications" />
      </header>
      <h1>How the workspace works</h1>
      <p className="track-page-lede">Shortcuts and the main surfaces, without ceremony.</p>

      <section className="mt-10">
        <h2>Shortcuts</h2>
        <ul className="mt-4 divide-y border-y">
          {shortcuts.map((item) => (
            <li key={item.keys} className="flex justify-between gap-4 py-3 text-sm">
              <span className="text-muted-foreground">{item.action}</span>
              <span className="font-mono text-xs tabular-nums">{item.keys}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 flex flex-col gap-8">
        {topics.map((topic) => (
          <div key={topic.title}>
            <h2>{topic.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{topic.body}</p>
          </div>
        ))}
      </section>

      <Link
        href="/applications"
        className="mt-12 text-sm text-foreground underline-offset-4 hover:underline"
      >
        Back to workspace
      </Link>
    </div>
  );
}
