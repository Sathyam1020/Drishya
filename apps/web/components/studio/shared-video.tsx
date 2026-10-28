"use client";
import { RadioGroup, RadioOption } from "@drishya/ui/components/radio-group";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { api } from "@/lib/api";
import { projectError } from "@/lib/projects";
import { ChoiceSelect } from "./choice-select";
import { StudioVideo } from "./studio-video";
import "./studio.css";
import { QuestionAnswers } from "./learning-content";
import "./learning.css";

type Question = { question: string; options: string[] };
type Session = {
  attemptId: string;
  secret: string;
  questions: Question[];
  answers: number[];
  name: string;
  result?: {
    score: number;
    total: number;
    review: {
      question: string;
      correctIndex: number;
      options: string[];
      explanation: string;
    }[];
  };
};
export function SharedVideoPage({ token }: { token: string }) {
  const base = `/shared/${token}`,
    storage = `drishya-quiz:${token}`,
    [selected, setSelected] = useState(""),
    [name, setName] = useState(""),
    [session, setSession] = useState<Session | null>(null),
    [restored, setRestored] = useState(false);
  const query = useQuery({
    queryKey: ["shared", token],
    queryFn: async () =>
      (await api.get(base)).data as {
        title: string;
        videos: { id: string; title: string; url: string }[];
        qna: { question: string; answer: string }[];
        quizEnabled: boolean;
      },
    retry: false,
  });
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storage);
      if (saved) {
        const value = JSON.parse(saved);
        if (
          value.attemptId &&
          value.secret &&
          Array.isArray(value.questions) &&
          Array.isArray(value.answers)
        ) {
          setSession(value);
          setName(value.name ?? "");
        }
      }
    } catch {}
    setRestored(true);
  }, [storage]);
  useEffect(() => {
    if (!restored) return;
    try {
      if (session) localStorage.setItem(storage, JSON.stringify(session));
      else localStorage.removeItem(storage);
    } catch {}
  }, [session, storage, restored]);
  const start = useMutation({
    mutationFn: () => api.post(`${base}/attempts`, { name: name.trim() }),
    onSuccess: (r) =>
      setSession({
        ...r.data,
        answers: r.data.questions.map(() => -1),
        name: name.trim(),
      }),
  });
  const submit = useMutation({
    mutationFn: () => {
      if (!session) throw new Error("Start a quiz first.");
      return api.post(`${base}/attempts/${session.attemptId}/submit`, {
        secret: session.secret,
        answers: session.answers,
      });
    },
    onSuccess: (r) =>
      setSession((current) =>
        current ? { ...current, result: r.data } : current,
      ),
  });
  const data = query.data,
    current = data?.videos.find((v) => v.id === selected) ?? data?.videos[0];
  return (
    <main className="v2-shared-page">
      <a href="/" className="v2-brand">
        drishya
      </a>
      {query.isPending ? (
        <p>Opening shared explanation…</p>
      ) : query.isError ? (
        <div role="alert" className="v2-error">
          {projectError(query.error)}
        </div>
      ) : (
        <>
          <h1>{data?.title}</h1>
          {data && data.videos.length > 1 && (
            <label htmlFor="shared-chapter">
              Chapter
              <ChoiceSelect
                id="shared-chapter"
                label="Chapter"
                value={current?.id ?? ""}
                onChange={setSelected}
                options={data.videos.map((v) => ({
                  value: v.id,
                  label: v.title,
                }))}
              />
            </label>
          )}
          {current && (
            <StudioVideo
              key={current.id}
              controls
              preload="metadata"
              src={current.url}
            />
          )}
          {!!data?.qna.length && (
            <section className="v2-feature-card">
              <h2>Questions & answers</h2>
              <p>Explore the key ideas from this explanation.</p>
              <QuestionAnswers items={data.qna} />
            </section>
          )}
          {data?.quizEnabled && (
            <section className="v2-feature-card">
              <h2>Check your understanding</h2>
              <p>
                Your name and quiz result will be visible to the person who
                shared this video.
              </p>
              {!restored ? (
                <p>Loading quiz session…</p>
              ) : !session ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    start.mutate();
                  }}
                >
                  <label>
                    Your name
                    <input
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    className="v2-button v2-button-primary"
                    disabled={name.trim().length < 2 || start.isPending}
                  >
                    {start.isPending ? "Starting…" : "Start quiz"}
                  </button>
                </form>
              ) : session.result ? (
                <>
                  <div className="learn-score">
                    <strong>
                      {session.result.score}/{session.result.total}
                    </strong>
                    <div>
                      <h3>Quiz complete, {session.name}.</h3>
                      <p>
                        Your result has been saved. Review the answers below.
                      </p>
                    </div>
                  </div>
                  {session.result.review.map((item, i) => (
                    <article className="learn-review" key={item.question}>
                      <span className="learn-question-meta">
                        Question {i + 1} of {session.result!.total}
                      </span>
                      <h4>{item.question}</h4>
                      <div
                        className={`learn-selected-answer ${session.answers[i] === item.correctIndex ? "is-correct" : "is-incorrect"}`}
                      >
                        <strong>
                          {session.answers[i] === item.correctIndex ? (
                            <>
                              <Check size={16} /> Correct
                            </>
                          ) : (
                            <>
                              <X size={16} /> Incorrect
                            </>
                          )}
                        </strong>
                        <span>
                          Your answer:{" "}
                          {item.options[session.answers[i]] ?? "Not answered"}
                        </span>
                      </div>
                      {session.answers[i] !== item.correctIndex && (
                        <p className="learn-correct-reference">
                          <Check size={15} />{" "}
                          <span>
                            Correct answer: {item.options[item.correctIndex]}
                          </span>
                        </p>
                      )}
                      <p>{item.explanation}</p>
                    </article>
                  ))}
                  <button
                    type="button"
                    className="v2-button"
                    onClick={() => {
                      setSession(null);
                      submit.reset();
                      start.reset();
                    }}
                  >
                    Start another attempt
                  </button>
                </>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit.mutate();
                  }}
                >
                  <div className="learn-quiz-progress">
                    <span>
                      {session.name} ·{" "}
                      {session.answers.filter((a) => a >= 0).length} of{" "}
                      {session.questions.length} answered
                    </span>
                    <div
                      className="learn-progress-track"
                      role="progressbar"
                      aria-label="Quiz completion"
                      aria-valuenow={
                        session.answers.filter((a) => a >= 0).length
                      }
                      aria-valuemin={0}
                      aria-valuemax={session.questions.length}
                    >
                      <span
                        style={{
                          width: `${(session.answers.filter((a) => a >= 0).length / session.questions.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  {session.questions.map((item, i) => (
                    <fieldset className="v2-quiz-question" key={item.question}>
                      <legend>
                        {i + 1}. {item.question}
                      </legend>
                      <RadioGroup
                        aria-label={item.question}
                        value={String(session.answers[i])}
                        onValueChange={(value) =>
                          setSession((current) =>
                            current
                              ? {
                                  ...current,
                                  answers: current.answers.map(
                                    (answer, index) =>
                                      index === i ? Number(value) : answer,
                                  ),
                                }
                              : current,
                          )
                        }
                      >
                        {item.options.map((option, j) => (
                          <RadioOption
                            key={option}
                            value={String(j)}
                            className={`v2-quiz-option ${session.answers[i] === j ? "is-selected" : ""}`}
                          >
                            <span className="learn-option-letter">
                              {String.fromCharCode(65 + j)}
                            </span>
                            <span>{option}</span>
                          </RadioOption>
                        ))}
                      </RadioGroup>
                    </fieldset>
                  ))}
                  <button
                    type="submit"
                    className="v2-button v2-button-primary"
                    disabled={
                      session.answers.some((a) => a < 0) || submit.isPending
                    }
                  >
                    {submit.isPending ? "Submitting…" : "Submit quiz"}
                  </button>
                </form>
              )}
              {(start.error || submit.error) && (
                <p role="alert" className="v2-error">
                  {projectError(start.error ?? submit.error)}
                </p>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
