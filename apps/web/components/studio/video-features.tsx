"use client";
import type { LearningContent } from "@drishya/contracts";
import { Checkbox } from "@drishya/ui/components/checkbox";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api } from "@/lib/api";
import { projectError } from "@/lib/projects";
import { ChoiceSelect } from "./choice-select";
import { LearningPanel } from "./learning-content";
import {
  BookOpen,
  Share2,
  Copy,
  ChartNoAxesColumn,
  LoaderCircle,
} from "lucide-react";
import "./learning.css";

type Features = {
  hasMore: boolean;
  learning: {
    status: string;
    content: LearningContent | null;
    error: string | null;
  } | null;
  shares: {
    id: string;
    showQuiz: boolean;
    showQna: boolean;
    revoked: boolean;
    createdAt: string;
  }[];
  attempts: {
    id: string;
    name: string;
    score: number | null;
    total: number;
    startedAt: string;
    submittedAt: string | null;
  }[];
};
export function VideoFeatures({
  revisionId,
  initialLanguage = "en",
}: {
  revisionId: string;
  initialLanguage?: string;
  initialVoice?: string;
}) {
  const [resultsOffset, setResultsOffset] = useState(0);
  const duplicateRequest = useRef({ signature: "", id: "" });
  const router = useRouter(),
    client = useQueryClient(),
    [tab, setTab] = useState("learn"),
    [showQna, setShowQna] = useState(true),
    [showQuiz, setShowQuiz] = useState(true),
    [url, setUrl] = useState(""),
    [copied, setCopied] = useState(false),
    [language, setLanguage] = useState(initialLanguage),
    [voice] = useState("male");
  const key = ["video-features", revisionId, resultsOffset],
    base = `/projects/video-features/${revisionId}`;
  const query = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await api.get(base, { params: { offset: resultsOffset } }))
        .data as Features,
    refetchInterval: (q) =>
      ["queued", "generating"].includes(q.state.data?.learning?.status ?? "")
        ? 2000
        : false,
  });
  const reload = () => client.invalidateQueries({ queryKey: key });
  const learning = useMutation({
    mutationFn: () => api.post(`${base}/learning`),
    onSuccess: reload,
  });
  const share = useMutation({
    mutationFn: () => api.post(`${base}/shares`, { showQna, showQuiz }),
    onSuccess: (r) => {
      setUrl(`${window.location.origin}${r.data.path}`);
      setCopied(false);
      void reload();
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`${base}/shares/${id}`),
    onSuccess: reload,
  });
  const duplicate = useMutation({
    mutationFn: () => {
      const signature = `${revisionId}:${language}:${voice}`;
      if (duplicateRequest.current.signature !== signature)
        duplicateRequest.current = { signature, id: crypto.randomUUID() };
      return api.post(
        `${base}/duplicate`,
        { language, voice, requestId: duplicateRequest.current.id },
        { timeout: 60000 },
      );
    },
    onSuccess: (r) => router.push(`/workspace/chat/${r.data.chatId}`),
  });
  const ready = query.data?.learning?.status === "ready",
    busy = ["queued", "generating"].includes(
      query.data?.learning?.status ?? "",
    );
  const error =
    query.error ??
    learning.error ??
    share.error ??
    revoke.error ??
    duplicate.error;
  return (
    <section className="v2-video-features">
      <div className="v2-feature-tabs" role="tablist" aria-label="Video tools">
        {[
          ["learn", "Q&A & quiz"],
          ["share", "Share video"],
          ["duplicate", "Duplicate"],
          ["results", "Quiz results"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            role="tab"
            aria-selected={tab === id}
            id={`video-tool-${revisionId}-${id}`}
            aria-controls={`feature-panel-${revisionId}`}
            tabIndex={tab === id ? 0 : -1}
            onKeyDown={(event) => {
              const ids = ["learn", "share", "duplicate", "results"];
              let next = ids.indexOf(id);
              if (event.key === "ArrowRight") next = (next + 1) % ids.length;
              else if (event.key === "ArrowLeft")
                next = (next + ids.length - 1) % ids.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = ids.length - 1;
              else return;
              event.preventDefault();
              setTab(ids[next]);
              document
                .getElementById(`video-tool-${revisionId}-${ids[next]}`)
                ?.focus();
            }}
            onClick={() => setTab(id)}
            className={tab === id ? "is-selected" : ""}
          >
            {id === "learn" ? (
              <BookOpen size={15} />
            ) : id === "share" ? (
              <Share2 size={15} />
            ) : id === "duplicate" ? (
              <Copy size={15} />
            ) : (
              <ChartNoAxesColumn size={15} />
            )}
            {label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="v2-error">
          {projectError(error)}
        </p>
      )}
      {query.isPending ? (
        <p>Loading video tools…</p>
      ) : (
        <div
          className="v2-feature-card"
          role="tabpanel"
          id={`feature-panel-${revisionId}`}
          aria-labelledby={`video-tool-${revisionId}-${tab}`}
        >
          {tab === "learn" && (
            <>
              {!ready && (
                <div className="learn-empty">
                  <div className="learn-intro-icon">
                    <BookOpen size={25} />
                  </div>
                  <h2>Turn watching into understanding.</h2>
                  <p>
                    Thoughtful questions and a short quiz, built from this
                    video's narration.
                  </p>
                  <button
                    type="button"
                    className="v2-button v2-button-primary"
                    disabled={busy || learning.isPending}
                    onClick={() => learning.mutate()}
                  >
                    {busy || learning.isPending ? (
                      <>
                        <LoaderCircle size={16} className="v2-spin" /> Preparing
                        your learning kit…
                      </>
                    ) : query.data?.learning?.status === "failed" ? (
                      "Retry Q&A and quiz"
                    ) : (
                      "Generate Q&A and quiz"
                    )}
                  </button>
                </div>
              )}
              {query.data?.learning?.error && (
                <p className="v2-error">{query.data.learning.error}</p>
              )}
              {ready && query.data?.learning?.content && (
                <LearningPanel
                  content={query.data.learning.content}
                  onShare={() => setTab("share")}
                />
              )}
            </>
          )}
          {tab === "share" && (
            <>
              <h2>Share this explanation</h2>
              <p>
                Anyone with the link can watch. Choose what else they can
                access.
              </p>
              <label
                className="v2-checkbox"
                htmlFor={`share-qna-${revisionId}`}
              >
                <Checkbox
                  id={`share-qna-${revisionId}`}
                  checked={showQna}
                  disabled={share.isPending}
                  onCheckedChange={(v) => setShowQna(v === true)}
                />{" "}
                Show Q&A
              </label>
              <label
                className="v2-checkbox"
                htmlFor={`share-quiz-${revisionId}`}
              >
                <Checkbox
                  id={`share-quiz-${revisionId}`}
                  checked={showQuiz}
                  disabled={share.isPending}
                  onCheckedChange={(v) => setShowQuiz(v === true)}
                />{" "}
                Enable named quiz and save results
              </label>
              {(showQna || showQuiz) && !ready && (
                <p>
                  Generate Q&A and quiz first, or turn both off to share only
                  the video.
                </p>
              )}
              <button
                type="button"
                className="v2-button v2-button-primary"
                disabled={share.isPending || ((showQna || showQuiz) && !ready)}
                onClick={() => share.mutate()}
              >
                Create share link
              </button>
              {url && (
                <div className="v2-share-link">
                  <label>
                    Share link
                    <input
                      readOnly
                      value={url}
                      onFocus={(e) => e.target.select()}
                    />
                  </label>
                  <button
                    type="button"
                    className="v2-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(url);
                        setCopied(true);
                      } catch {
                        setCopied(false);
                      }
                    }}
                  >
                    {copied ? "Copied" : "Copy link"}
                  </button>
                  <a
                    className="v2-text-button"
                    target="_blank"
                    rel="noreferrer"
                    href={url}
                  >
                    Open shared page
                  </a>
                </div>
              )}
              <h3>Existing links</h3>
              {!query.data?.shares.length && <p>No shared links yet.</p>}
              {query.data?.shares.map((item) => (
                <div className="v2-share-entry" key={item.id}>
                  <span>
                    {new Date(item.createdAt).toLocaleString()} ·{" "}
                    {item.showQna ? "Q&A" : "No Q&A"} ·{" "}
                    {item.showQuiz ? "Quiz" : "No quiz"}
                  </span>
                  <button
                    type="button"
                    className="v2-text-button"
                    disabled={item.revoked || revoke.isPending}
                    onClick={() => revoke.mutate(item.id)}
                  >
                    {item.revoked ? "Revoked" : "Revoke access"}
                  </button>
                </div>
              ))}
            </>
          )}
          {tab === "duplicate" && (
            <>
              <h2>Create a language copy</h2>
              <p>
                Create a separate copy with the same content and visuals. Your
                original stays in your library.
              </p>
              <label htmlFor={`duplicate-language-${revisionId}`}>
                Language
                <ChoiceSelect
                  id={`duplicate-language-${revisionId}`}
                  label="Copy language"
                  value={language}
                  disabled={duplicate.isPending}
                  onChange={setLanguage}
                  options={[
                    { value: "en", label: "English" },
                    { value: "hi", label: "Hindi" },
                    { value: "kn", label: "Kannada" },
                    { value: "te", label: "Telugu" },
                  ]}
                />
              </label>
              <button
                type="button"
                className="v2-button v2-button-primary"
                disabled={duplicate.isPending}
                onClick={() => duplicate.mutate()}
              >
                {duplicate.isPending ? "Creating copy…" : "Duplicate video"}
              </button>
            </>
          )}
          {tab === "results" && (
            <>
              <h2>Quiz results</h2>
              <p>
                Participant names are self-reported. Submitted answers are
                graded on the server.
              </p>
              <button
                type="button"
                className="v2-text-button"
                onClick={() => void reload()}
              >
                Refresh results
              </button>
              {!query.data?.attempts.length ? (
                <p>No participants yet. Share a link with the quiz enabled.</p>
              ) : (
                <div className="v2-results-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Score</th>
                        <th>Status</th>
                        <th>Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {query.data?.attempts.map((attempt) => (
                        <tr key={attempt.id}>
                          <td>{attempt.name}</td>
                          <td>
                            {attempt.submittedAt
                              ? `${attempt.score}/${attempt.total}`
                              : "—"}
                          </td>
                          <td>
                            {attempt.submittedAt ? "Submitted" : "In progress"}
                          </td>
                          <td>
                            {new Date(attempt.startedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="v2-feature-tabs">
                <button
                  type="button"
                  disabled={resultsOffset === 0 || query.isFetching}
                  onClick={() =>
                    setResultsOffset((current) => Math.max(0, current - 50))
                  }
                >
                  Previous
                </button>
                <span>Page {Math.floor(resultsOffset / 50) + 1}</span>
                <button
                  type="button"
                  disabled={!query.data?.hasMore || query.isFetching}
                  onClick={() => setResultsOffset((current) => current + 50)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
