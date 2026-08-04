'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders an assistant answer as markdown.
 *
 * The model emits markdown — `**bold**` around every figure, `###` section headings, bullet
 * lists — and the panel was printing it verbatim inside a <p>, so answers arrived as a wall
 * of asterisks and hashes. The emphasis matters here: it is what separates a sourced number
 * from the prose around it.
 *
 * Styling is inline per element rather than via a typography plugin, so it inherits the
 * panel's type scale instead of importing a second one.
 */
export function AssistantMarkdown({ children }: { children: string }) {
  return (
    <div className="font-sans [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (props) => <p className="my-2 leading-relaxed" {...props} />,
          strong: (props) => <strong className="font-semibold text-foreground" {...props} />,
          em: (props) => <em className="italic" {...props} />,
          ul: (props) => <ul className="my-2 space-y-1 list-disc pl-4" {...props} />,
          ol: (props) => <ol className="my-2 space-y-1 list-decimal pl-4" {...props} />,
          li: (props) => <li className="leading-relaxed" {...props} />,
          h1: (props) => <h3 className="mt-4 mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground" {...props} />,
          h2: (props) => <h3 className="mt-4 mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground" {...props} />,
          h3: (props) => <h3 className="mt-4 mb-2 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground" {...props} />,
          h4: (props) => <h4 className="mt-3 mb-1 font-semibold text-foreground" {...props} />,
          code: (props) => (
            <code className="px-1 py-0.5 rounded bg-secondary font-mono text-[0.9em]" {...props} />
          ),
          pre: (props) => (
            <pre className="my-2 p-3 rounded-[12px] bg-secondary overflow-x-auto font-mono text-[12px]" {...props} />
          ),
          hr: () => <hr className="my-3 border-border" />,
          blockquote: (props) => (
            <blockquote className="my-2 pl-3 border-l-2 border-border text-muted-foreground" {...props} />
          ),
          // Wide tables must scroll inside the panel rather than widen it.
          table: (props) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full text-left border-collapse" {...props} />
            </div>
          ),
          th: (props) => <th className="py-1 pr-3 font-semibold border-b border-border" {...props} />,
          td: (props) => <td className="py-1 pr-3 border-b border-border/50" {...props} />,
          a: (props) => (
            <a className="underline underline-offset-2 hover:text-foreground" target="_blank"
               rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
