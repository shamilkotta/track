import Link from "nlite/link";
import { Target } from "lucide-react";
export const rendering = "force-ssr";

const shortcuts = [
  { keys: "⌘K", action: "Open quick search" },
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
    <div className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-4 py-10">
      <div className="mb-8">
        <Link href="/applications" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
            <Target className="size-4" />
          </div>
          <span className="font-semibold tracking-tight">Trackr</span>
        </Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">Help center</h1>
      <p className="mt-1 text-sm text-muted-foreground">How the workspace actually works.</p>
      <section className="mt-8">
        <h2 className="text-sm font-semibold">Shortcuts</h2>
        <ul className="mt-3 divide-y">
          {shortcuts.map((item) => (
            <li key={item.keys} className="flex justify-between gap-4 py-2 text-sm">
              <span className="text-muted-foreground">{item.action}</span>
              <span className="font-mono text-xs">{item.keys}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-8 flex flex-col gap-5">
        {topics.map((topic) => (
          <div key={topic.title}>
            <h2 className="text-sm font-semibold">{topic.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{topic.body}</p>
          </div>
        ))}
      </section>
      <Link href="/applications" className="mt-10 text-sm underline-offset-4 hover:underline">
        Back to workspace
      </Link>
    </div>
  );
}
