import type { Quiz } from './validation';
export function scoreQuiz(quiz: Quiz, answers: number[]) {
  if (answers.length !== quiz.questions.length || answers.some(a => !Number.isInteger(a) || a < 0 || a > 3)) throw new Error('Choose an answer for every question.');
  const correct = quiz.questions.filter((q, i) => q.correctIndex === answers[i]).length;
  return { correct, total: quiz.questions.length, score: Math.round(correct / quiz.questions.length * 100) };
}
