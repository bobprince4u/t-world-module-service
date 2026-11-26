import { useCallback, useState } from "react";
import { signIn, signUp, logOut } from "./lib/auth";
import { apiRequest } from "./lib/api";

interface Profile {
  email: string;
  role: string;
  tokenBalance: number;
}

interface ContentItem {
  _id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
}

interface ContentResponse {
  items: ContentItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface SummaryResponse {
  summary: string;
  aiRunId: string;
  tokensAwarded: number;
  tokenBalance: number;
}

interface TokenTransaction {
  _id: string;
  type: "EARN" | "CONVERT" | "WITHDRAW";
  source: "AI_USAGE" | "MANUAL" | "SYSTEM";
  amount: number;
  balanceAfter: number;
  referenceId: string;
  createdAt: string;
}

interface TokenHistoryResponse {
  transactions: TokenTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ConversionResponse {
  message: string;
  txHashMock: string;
  convertedAmount: string;
  tokenBalance: number;
}

interface WithdrawalResponse {
  status: "SUCCESS";
  network: "Ethereum";
  txHashMock: string;
}

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [contents, setContents] = useState<ContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState("");

  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [summarizingId, setSummarizingId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [aiError, setAiError] = useState("");

  const [transactions, setTransactions] = useState<TokenTransaction[]>([]);
  const [tokenAmount, setTokenAmount] = useState("100");
  const [targetAsset, setTargetAsset] = useState<"MOCK_USDT" | "MOCK_ETH">(
    "MOCK_USDT",
  );
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenMessage, setTokenMessage] = useState("");
  const [tokenError, setTokenError] = useState("");

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const fetchContents = useCallback(async () => {
    setContentLoading(true);
    setContentError("");

    try {
      const response = await apiRequest<ContentResponse>("/content");
      setContents(response.items);
    } catch (err) {
      setContentError(
        err instanceof Error ? err.message : "Failed to load content",
      );
    } finally {
      setContentLoading(false);
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isRegistering) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }

      const response = await apiRequest<{ data: Profile }>("/auth/me");
      setProfile(response.data);
      setAuthenticated(true);
      await fetchContents();
      await fetchTokenHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateContent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setContentError("");
    setCreateMessage("");

    try {
      await apiRequest<{ content: ContentItem }>("/content", {
        method: "POST",
        body: JSON.stringify({
          title,
          body,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      setTitle("");
      setBody("");
      setTags("");
      setCreateMessage("Content created successfully.");
      await fetchContents();
    } catch (err) {
      setContentError(
        err instanceof Error ? err.message : "Failed to create content",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleSummarize(contentId: string) {
    setSummarizingId(contentId);
    setAiError("");

    try {
      const response = await apiRequest<SummaryResponse>(
        `/content/${contentId}/ai/summarize`,
        {
          method: "POST",
          body: JSON.stringify({ tone, length }),
        },
      );

      setSummaries((previous) => ({
        ...previous,
        [contentId]: response.summary,
      }));

      setProfile((previous) =>
        previous
          ? { ...previous, tokenBalance: response.tokenBalance }
          : previous,
      );
    } catch (err) {
      setAiError(
        err instanceof Error ? err.message : "AI summarization failed",
      );
    } finally {
      setSummarizingId(null);
    }
  }

  async function fetchTokenHistory() {
    try {
      const response =
        await apiRequest<TokenHistoryResponse>("/tokens/history");
      setTransactions(response.transactions);
    } catch (err) {
      setTokenError(
        err instanceof Error ? err.message : "Failed to load transactions",
      );
    }
  }

  async function handleConvert(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTokenLoading(true);
    setTokenError("");
    setTokenMessage("");

    try {
      const response = await apiRequest<ConversionResponse>("/tokens/convert", {
        method: "POST",
        body: JSON.stringify({
          toAsset: targetAsset,
          amount: Number(tokenAmount),
        }),
      });

      setProfile((previous) =>
        previous
          ? { ...previous, tokenBalance: response.tokenBalance }
          : previous,
      );

      setTokenMessage(
        `Converted successfully: ${response.convertedAmount}. Transaction: ${response.txHashMock}`,
      );

      await fetchTokenHistory();
    } catch (err) {
      setTokenError(
        err instanceof Error ? err.message : "Token conversion failed",
      );
    } finally {
      setTokenLoading(false);
    }
  }

  async function handleWithdraw() {
    setTokenLoading(true);
    setTokenError("");
    setTokenMessage("");

    try {
      const response = await apiRequest<WithdrawalResponse>(
        "/tokens/withdraw",
        { method: "POST" },
      );

      setTokenMessage(
        `Withdrawal successful on ${response.network}. Transaction: ${response.txHashMock}`,
      );

      await fetchTokenHistory();
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : "Withdrawal failed");
    } finally {
      setTokenLoading(false);
    }
  }

  async function handleLogout() {
    await logOut();
    setAuthenticated(false);
    setProfile(null);
    setContents([]);
  }

  if (authenticated) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                T-World Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Content and AI management
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="font-medium text-slate-800">{profile?.email}</p>
                <p className="text-slate-500">
                  {profile?.role} · {profile?.tokenBalance} tokens
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white"
              >
                Sign out
              </button>
            </div>
          </header>

          <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-slate-900">
              Create content
            </h2>

            <form onSubmit={handleCreateContent} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Title</label>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Enter content title"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Body</label>
                <textarea
                  required
                  rows={5}
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="Write your content..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Tags</label>
                <input
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                  placeholder="technology, education, business"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Separate tags with commas.
                </p>
              </div>

              {createMessage && (
                <p className="text-sm text-green-600">{createMessage}</p>
              )}

              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create content"}
              </button>
            </form>
          </section>

          <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">AI settings</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Tone</label>
                <select
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="simple">Simple</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Summary length
                </label>
                <select
                  value={length}
                  onChange={(event) => setLength(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
              </div>
            </div>
          </section>

          <section className="mb-6 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Token management
            </h2>

            <div className="mb-6 rounded-lg bg-slate-900 p-5 text-white">
              <p className="text-sm text-slate-300">Available balance</p>
              <p className="mt-1 text-3xl font-bold">
                {profile?.tokenBalance ?? 0} tokens
              </p>
            </div>

            <h3 className="mb-3 font-semibold">Convert tokens</h3>

            <form onSubmit={handleConvert} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Amount of tokens
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={tokenAmount}
                  onChange={(event) => setTokenAmount(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Convert to
                </label>
                <select
                  value={targetAsset}
                  onChange={(event) =>
                    setTargetAsset(
                      event.target.value as "MOCK_USDT" | "MOCK_ETH",
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="MOCK_USDT">
                    MOCK_USDT (100 tokens = 1 USDT)
                  </option>
                  <option value="MOCK_ETH">
                    MOCK_ETH (200 tokens = 0.01 ETH)
                  </option>
                </select>
              </div>

              <button
                type="submit"
                disabled={tokenLoading}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {tokenLoading ? "Processing..." : "Convert tokens"}
              </button>
            </form>

            <div className="my-6 border-t border-slate-200" />

            <h3 className="mb-2 font-semibold">Simulated withdrawal</h3>
            <p className="mb-3 text-sm text-slate-500">
              Withdraw all eligible converted assets to the simulated Ethereum
              network. This is a mock transaction, not a real blockchain
              transfer.
            </p>

            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={tokenLoading}
              className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              Simulate withdrawal
            </button>

            {tokenMessage && (
              <p className="mt-4 break-all rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {tokenMessage}
              </p>
            )}

            {tokenError && (
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {tokenError}
              </p>
            )}

            <div className="my-6 border-t border-slate-200" />

            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Transaction history</h3>
              <button
                onClick={() => void fetchTokenHistory()}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Refresh
              </button>
            </div>

            {transactions.length === 0 ? (
              <p className="text-sm text-slate-500">
                No transactions loaded. Click Refresh to load history.
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex justify-between gap-3">
                      <span className="text-sm font-semibold">
                        {transaction.type}
                      </span>
                      <span className="text-sm font-medium">
                        {transaction.amount} tokens
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                      <span>{transaction.source}</span>
                      <span>Balance after: {transaction.balanceAfter}</span>
                    </div>

                    <p className="mt-1 text-xs text-slate-400">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {showWithdrawModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Confirm withdrawal
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    You are about to withdraw all eligible converted assets to
                    the simulated Ethereum network. This is a mock transaction,
                    not a real blockchain transfer.
                  </p>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowWithdrawModal(false)}
                      disabled={tokenLoading}
                      className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await handleWithdraw();
                        setShowWithdrawModal(false);
                      }}
                      disabled={tokenLoading}
                      className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                    >
                      {tokenLoading ? "Processing..." : "Confirm withdrawal"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Content library
                </h2>
                <p className="text-sm text-slate-500">
                  Your latest content records
                </p>
              </div>

              <button
                onClick={() => void fetchContents()}
                disabled={contentLoading}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                {contentLoading ? "Loading..." : "Refresh"}
              </button>
            </div>

            {contentError && (
              <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {contentError}
              </p>
            )}
            {aiError && (
              <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {aiError}
              </p>
            )}

            {contentLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Loading content...
              </p>
            ) : contents.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No content yet. Create your first content record above.
              </p>
            ) : (
              <div className="space-y-4">
                {contents.map((item) => (
                  <article
                    key={item._id}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900">
                        {item.title}
                      </h3>
                      <span className="text-xs text-slate-400">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                      {item.body}
                    </p>

                    {item.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-blue-50 px-3 py-1 text-xs text-blue-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-4">
                      <button
                        onClick={() => void handleSummarize(item._id)}
                        disabled={summarizingId !== null}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {summarizingId === item._id
                          ? "Generating summary..."
                          : "Generate AI summary"}
                      </button>

                      {summaries[item._id] && (
                        <div className="mt-3 rounded-lg bg-slate-50 p-4">
                          <h4 className="mb-2 text-sm font-semibold text-slate-900">
                            AI Summary
                          </h4>
                          <p className="whitespace-pre-wrap text-sm text-slate-700">
                            {summaries[item._id]}
                          </p>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">T-World</h1>
          <p className="mt-2 text-sm text-slate-500">
            Module Service Admin Portal
          </p>
        </div>

        <h2 className="text-xl font-semibold">
          {isRegistering ? "Create account" : "Welcome back"}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {isRegistering
            ? "Create your account to continue."
            : "Sign in to access your dashboard."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 py-3 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading
              ? "Please wait..."
              : isRegistering
                ? "Create account"
                : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setIsRegistering(!isRegistering);
            setError("");
          }}
          className="mt-6 w-full text-sm text-blue-600 hover:underline"
        >
          {isRegistering
            ? "Already have an account? Sign in"
            : "Don't have an account? Create one"}
        </button>
      </section>
    </main>
  );
}

export default App;
