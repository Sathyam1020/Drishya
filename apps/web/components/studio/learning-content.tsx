"use client";
import { useId, useState } from "react";
import {
  Check,
  ChevronDown,
  Eye,
  EyeOff,
  Lightbulb,
  BookOpen,
  ListChecks,
} from "lucide-react";
import type { LearningContent } from "@drishya/contracts";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@drishya/ui/components/accordion";
import "./learning.css";

export function QuestionAnswers({
  items,
}: {
  items: { question: string; answer: string }[];
}) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="question-0"
      className="learn-accordion"
    >
      {items.map((item, index) => (
        <AccordionItem
          key={`${index}-${item.question}`}
          value={`question-${index}`}
          className="learn-answer-item"
        >
          <AccordionTrigger className="learn-answer-trigger">
            <span className="learn-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{item.question}</span>
            <ChevronDown
              size={18}
              aria-hidden="true"
              className="learn-chevron"
            />
          </AccordionTrigger>
          <AccordionContent className="learn-answer-content">
            <div>{item.answer}</div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function QuizPreview({ items }: { items: LearningContent["quiz"] }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const prefix = useId();
  return (
    <div className="learn-quiz-list">
      {items.map((item, index) => {
        const open = revealed.has(index);
        return (
          <article
            className="learn-quiz-card"
            key={`${index}-${item.question}`}
          >
            <div className="learn-question-meta">
              <span>
                Question {index + 1}{" "}
                <span className="learn-meta-muted">of {items.length}</span>
              </span>
              <span className="learn-tag">Single choice</span>
            </div>
            <h4>{item.question}</h4>
            <ol className="learn-options" aria-label="Answer choices">
              {item.options.map((option, i) => (
                <li
                  key={`${i}-${option}`}
                  className={
                    open && item.correctIndex === i ? "is-correct" : ""
                  }
                >
                  <span className="learn-option-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{option}</span>
                  {open && item.correctIndex === i && (
                    <Check size={17} aria-label="Correct answer" />
                  )}
                </li>
              ))}
            </ol>
            <div className="learn-answer-footer">
              <button
                type="button"
                className="learn-reveal"
                aria-expanded={open}
                aria-controls={`${prefix}-explanation-${index}`}
                onClick={() =>
                  setRevealed((current) => {
                    const next = new Set(current);
                    if (open) next.delete(index);
                    else next.add(index);
                    return next;
                  })
                }
              >
                {open ? <EyeOff size={15} /> : <Eye size={15} />}{" "}
                {open ? "Hide answer" : "Reveal answer"}
              </button>
              <span>Owner preview</span>
            </div>
            {open && (
              <div
                className="learn-explanation"
                id={`${prefix}-explanation-${index}`}
              >
                <Lightbulb size={18} />
                <div>
                  <strong>Why this answer?</strong>
                  <p>{item.explanation}</p>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

export function LearningPanel({
  content,
  onShare,
}: {
  content: LearningContent;
  onShare: () => void;
}) {
  const [view, setView] = useState<"qna" | "quiz">("qna");
  return (
    <div className="learn-workspace">
      <div className="learn-intro">
        <div className="learn-intro-icon">
          <BookOpen size={23} />
        </div>
        <div>
          <h2>Questions & quiz</h2>
          <p>Explore the explanation, then check your understanding.</p>
        </div>
        <span className="learn-ready">
          <Check size={13} /> Ready to explore
        </span>
      </div>
      <div className="learn-switch" role="group" aria-label="Learning content">
        <button
          type="button"
          aria-pressed={view === "qna"}
          onClick={() => setView("qna")}
        >
          <BookOpen size={16} /> Questions &amp; answers{" "}
          <span>{content.qna.length}</span>
        </button>
        <button
          type="button"
          aria-pressed={view === "quiz"}
          onClick={() => setView("quiz")}
        >
          <ListChecks size={17} /> Quiz preview{" "}
          <span>{content.quiz.length}</span>
        </button>
      </div>
      <div className="learn-section-heading">
        <div>
          <h3>
            {view === "qna" ? "A closer look" : "Check your understanding"}
          </h3>
          <p>
            {view === "qna"
              ? "Open a question to explore the explanation."
              : "Preview the questions before sharing. Answers stay hidden until you reveal them."}
          </p>
        </div>
        {view === "quiz" && (
          <button
            type="button"
            className="learn-share-button"
            onClick={onShare}
          >
            Share quiz
          </button>
        )}
      </div>
      {view === "qna" ? (
        <QuestionAnswers items={content.qna} />
      ) : (
        <QuizPreview items={content.quiz} />
      )}
    </div>
  );
}
