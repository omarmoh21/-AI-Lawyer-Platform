import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'

// Renders a legal answer written in lightweight markdown (bold **headers**,
// single-newline line breaks) as clean RTL Arabic. Used for supervisor/agent
// answers that follow the البحث القانوني answer structure.
export default function AnswerText({ children }: { children: string }) {
  return (
    <div dir="rtl" className="text-sm leading-loose text-navy-800">
      <ReactMarkdown
        remarkPlugins={[remarkBreaks]}
        components={{
          // Section headers (**الإجابة المختصرة** ...) render as block labels.
          strong: ({ children }) => (
            <strong className="mt-3 block font-bold text-navy-900 first:mt-0">
              {children}
            </strong>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3 mr-4 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 mr-4 list-decimal space-y-1">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-e-2 border-gold-300 bg-navy-50 px-3 py-2">
              {children}
            </blockquote>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
