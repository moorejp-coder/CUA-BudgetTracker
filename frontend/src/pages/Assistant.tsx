import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AssistantApi, LlmApi } from "@/api/resources";

interface Message {
  role: "user" | "assistant";
  text: string;
  source?: string;
  intents?: string[];
  error?: boolean;
}

const SUGGESTIONS = [
  "How much did I spend on groceries last month?",
  "Am I over budget this month?",
  "What are my current subscriptions costing me?",
  "How is my emergency fund goal tracking?",
];

export default function Assistant() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { data: status } = useQuery({ queryKey: ["llm-status"], queryFn: LlmApi.status, refetchInterval: 30_000 });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question?: string) {
    const q = (question ?? input).trim();
    if (!q || loading) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await AssistantApi.query(q);
      setMessages((m) => [...m, { role: "assistant", text: res.answer, source: res.source, intents: res.intents }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: e?.response?.data?.detail ?? "Something went wrong answering that.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-64px)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Money Assistant</h1>
          <p className="text-sm text-white/50 mt-1">
            Answers come only from your own computed data — the model never sees raw transaction rows.
          </p>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${
            status?.reachable ? "bg-income-bg text-income" : "bg-warning-bg text-warning"
          }`}
        >
          {status?.reachable ? `LLM connected (${status.model})` : "LLM offline — using deterministic summaries"}
        </span>
      </div>

      <div className="card flex-1 overflow-y-auto flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-10">
            <p className="text-white/40 text-sm">Ask anything about your budget, spending, or goals.</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="btn-secondary text-xs px-3 py-1.5">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm whitespace-pre-line ${
                m.role === "user"
                  ? "bg-accent text-white"
                  : m.error
                    ? "bg-expense-bg text-expense"
                    : "bg-surface-raised text-white/80"
              }`}
            >
              {m.text}
              {m.role === "assistant" && !m.error && (
                <div className="text-[10px] text-white/30 mt-1.5 uppercase tracking-wide flex gap-2">
                  <span>{m.source}</span>
                  {m.intents?.map((intent) => (
                    <span key={intent} className="px-1.5 py-0.5 rounded bg-white/5">
                      {intent}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-white/40 text-sm">Thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2"
      >
        <input
          className="input flex-1"
          placeholder="Ask a question about your finances…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn-primary" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}
