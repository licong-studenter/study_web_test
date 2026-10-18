import { useEffect, useMemo, useState } from 'react';

export type QuizQuestion = {
  id: string;
  stem: string;
  options: string[];
  answer: number;
  explanation: string;
};

function formatIndex(index: number) {
  return String.fromCharCode(65 + index);
}

export default function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  useEffect(() => {
    document.documentElement.dataset.quizReady = 'true';
    return () => {
      delete document.documentElement.dataset.quizReady;
    };
  }, []);
  const answered = Object.keys(answers).length;
  const correct = useMemo(
    () => questions.filter((question) => answers[question.id] === question.answer).length,
    [answers, questions],
  );
  const done = answered === questions.length;

  useEffect(() => {
    if (!done) return;
    window.dispatchEvent(
      new CustomEvent('xiaoju:speak', {
        detail: {
          text:
            correct === questions.length
              ? '传感器校准完成，答得很漂亮！'
              : '复盘一下解析，再试一次也没关系。',
          mood: correct === questions.length ? 'happy' : 'curious',
        },
      }),
    );
  }, [done, correct, questions.length]);

  const reset = () => setAnswers({});

  return (
    <section className="quiz-card" aria-labelledby="quiz-title">
      <div className="quiz-head">
        <div>
          <span className="mono">KNOWLEDGE CHECK</span>
          <h2 id="quiz-title">本节测验</h2>
        </div>
        <div className="quiz-score" aria-live="polite">
          {answered === 0 ? '3 道单选题' : `${correct} / ${questions.length} 正确`}
          <br />
          <b>
            {answered}/{questions.length}
          </b>{' '}
          已作答
        </div>
      </div>
      <div className="quiz-list">
        {questions.map((question, questionIndex) => {
          const selected = answers[question.id];
          const hasAnswer = selected !== undefined;
          return (
            <div className="quiz-question" key={question.id}>
              <div className="quiz-stem">
                <span className="qnum">{String(questionIndex + 1).padStart(2, '0')}</span>
                <span>{question.stem}</span>
              </div>
              <div className="quiz-options" role="group" aria-label={`第 ${questionIndex + 1} 题`}>
                {question.options.map((option, optionIndex) => {
                  let className = 'quiz-option';
                  if (hasAnswer && optionIndex === question.answer) className += ' correct';
                  if (hasAnswer && selected === optionIndex && optionIndex !== question.answer) className += ' wrong';
                  return (
                    <button
                      className={className}
                      key={option}
                      type="button"
                      disabled={hasAnswer}
                      aria-pressed={selected === optionIndex}
                      onClick={() =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: optionIndex,
                        }))
                      }
                    >
                      <span className="key">{formatIndex(optionIndex)}</span>
                      <span>{option}</span>
                    </button>
                  );
                })}
              </div>
              {hasAnswer && (
                <div className="quiz-feedback" role="status">
                  <strong>{selected === question.answer ? '回答正确。' : '再想一步。'}</strong>{' '}
                  {question.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {done && (
        <div className="quiz-result" aria-live="polite">
          <p>
            本次得分 <strong>{Math.round((correct / questions.length) * 100)}</strong> 分。
            {correct === questions.length
              ? ' 三个核心判断都抓住了，可以进入下一节。'
              : ' 回到解析中复盘错题，再试一次。'}
          </p>
          <button className="quiz-reset" type="button" onClick={reset}>
            重新作答
          </button>
        </div>
      )}
    </section>
  );
}
