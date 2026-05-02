import { Construction } from "lucide-react";

interface TabComingSoonProps {
  title: string;
  description: string;
  items?: string[];
}

export function TabComingSoon({ title, description, items }: TabComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="rounded-full bg-zinc-800 p-4 mb-6">
        <Construction className="h-8 w-8 text-zinc-400" />
      </div>
      <h2 className="text-xl font-bold text-zinc-200 mb-2">{title}</h2>
      <p className="text-sm text-zinc-400 max-w-md mb-6">{description}</p>
      {items && items.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-left max-w-sm w-full">
          <p className="text-xs font-semibold text-zinc-500 uppercase mb-3">Will include</p>
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
