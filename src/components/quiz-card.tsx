'use client';
import { useState } from 'react';
import { useRows, useWorkspace } from './workspace-provider';
import { useOperation } from './use-operation';
import { Button, FormError } from './ui';
import { browserDb } from '@/lib/supabase/client';
import { scoreQuiz } from '@/lib/quiz';
import type { Quiz } from '@/lib/validation';
export function QuizCard({ quiz, messageId }: { quiz: Quiz; messageId: string }) {
  const attempts = useRows('quiz_attempts'); const { userId } = useWorkspace(); const operation = useOperation();
  const previous = attempts.data?.find(a => a.message_id === messageId);
  const [answers, setAnswers] = useState<number[]>(Array(quiz.questions.length).fill(-1));
  const selected = previous && Array.isArray(previous.answers) && previous.answers.every(a => typeof a === 'number') ? previous.answers as number[] : answers;
  async function submit(e: React.FormEvent) { e.preventDefault(); await operation.run(async () => { const { score } = scoreQuiz(quiz, answers); const { error } = await browserDb().from('quiz_attempts').upsert({ user_id: userId, message_id: messageId, answers, score }, { onConflict: 'user_id,message_id' }); if (error) throw error; }, ['quiz_attempts'], 'Quiz result saved.'); }
  async function retry() { if (previous && await operation.run(async () => { const { error } = await browserDb().from('quiz_attempts').delete().eq('id', previous.id).select('id').single(); if (error) throw error; }, ['quiz_attempts'])) setAnswers(Array(quiz.questions.length).fill(-1)); }
  return <form className="quiz" onSubmit={submit}><h3>{quiz.title}</h3>{previous && <p className="quiz-score">{previous.score}% · Quiz completed</p>}{quiz.questions.map((q, i) => <fieldset key={i} className="quiz-question"><legend>{i + 1}. {q.question}</legend><div className="quiz-options">{q.options.map((option, j) => <label key={j} className={`quiz-option ${previous ? j === q.correctIndex ? 'correct' : selected[i] === j ? 'incorrect' : '' : ''}`}><input type="radio" name={`${messageId}-question-${i}`} value={j} checked={selected[i] === j} disabled={!!previous || operation.busy} onChange={() => setAnswers(a => a.map((v, n) => n === i ? j : v))} /><span>{option}</span></label>)}</div>{previous && <p className="quiz-explanation">{q.explanation}</p>}</fieldset>)}<FormError error={operation.error || (attempts.error ? 'Your previous quiz result could not be loaded. Refresh before submitting.' : '')} />{previous ? <Button type="button" variant="secondary" busy={operation.busy} onClick={retry}>Try again</Button> : <Button type="submit" busy={operation.busy} disabled={attempts.isPending || !!attempts.error || answers.includes(-1)}>Check my answers</Button>}<p className="tiny muted mt">AI-generated questions can contain mistakes. Check explanations against your course materials.</p></form>;
}
