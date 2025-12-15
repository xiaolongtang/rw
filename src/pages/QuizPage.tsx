import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  App as AntdApp,
  Badge,
  Button,
  Card,
  Flex,
  Progress,
  Result,
  Space,
  Typography,
  Input,
  Spin
} from 'antd';
import { useDatasetContext } from '../contexts/DatasetContext';
import { findUnit, getLanguageNode } from '../services/dataService';
import {
  buildInitialQueue,
  getTotalItems,
  isUnitMastered,
  markMastered,
  masteredCount,
  requeueItem
} from '../domain/quiz';
import { MasteredMap, QuizItem } from '../domain/types';
import { getUnitProgress, saveUnitProgress } from '../services/progressService';
import { recordSession } from '../services/statsService';

const { Title, Text } = Typography;

function splitStatementWithBlank(statement: string, keyword?: string) {
  if (!statement) {
    return { before: '', after: '', matched: false };
  }
  if (!keyword) {
    return { before: statement, after: '', matched: false };
  }
  const idx = statement.indexOf(keyword);
  if (idx === -1) {
    return { before: `${statement} `, after: '', matched: false };
  }
  return {
    before: statement.slice(0, idx),
    after: statement.slice(idx + keyword.length),
    matched: true
  };
}

const QuizPage: React.FC = () => {
  const { language, unit } = useParams<{ language: string; unit: string }>();
  const { dataset } = useDatasetContext();
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();

  const [masteredMap, setMasteredMap] = useState<MasteredMap>({});
  const [queue, setQueue] = useState<QuizItem[]>([]);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<{
    status: 'correct' | 'wrong';
    answer: string;
    statement?: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [showStatement, setShowStatement] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [wrongCount, setWrongCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [startAt] = useState(() => Date.now());
  const [pendingQueue, setPendingQueue] = useState<QuizItem[] | null>(null);
  const [locked, setLocked] = useState(false);

  const languageNode = useMemo(
    () => (language && dataset ? getLanguageNode(dataset, language) : undefined),
    [dataset, language]
  );
  const questions = useMemo(
    () => (languageNode && unit ? findUnit(languageNode, unit) || [] : []),
    [languageNode, unit]
  );
  const totalItems = useMemo(() => getTotalItems(questions), [questions]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      if (!language || !unit) return;
      const progress = await getUnitProgress(language, unit);
      const initialMastered = progress?.masteredMap || {};
      const initialQueue =
        progress?.queueState && progress.queueState.length > 0
          ? progress.queueState
          : buildInitialQueue(questions, initialMastered);
      if (!mounted) return;
      setMasteredMap(initialMastered);
      setQueue(initialQueue);
      setLoading(false);
    }
    init();
    return () => {
      mounted = false;
    };
  }, [language, unit, questions]);

  useEffect(() => {
    async function persistProgress(nextQueue: QuizItem[], nextMastered: MasteredMap) {
      if (!language || !unit) return;
      await saveUnitProgress(language, unit, nextMastered, nextQueue);
    }
    if (!loading) {
      persistProgress(queue, masteredMap);
    }
  }, [queue, masteredMap, language, unit, loading]);

  useEffect(() => {
    if (!loading && !completed && queue.length === 0 && totalItems > 0 && language && unit) {
      setCompleted(true);
      const finishedAt = Date.now();
      recordSession({
        date: new Date().toISOString().slice(0, 10),
        languageCode: language,
        unitName: unit,
        startedAt: startAt,
        finishedAt,
        durationSec: Math.max(1, Math.round((finishedAt - startAt) / 1000)),
        totalItems: totalItems,
        wrongCount,
        retryCount
      });
      message.success('恭喜完成该单元！');
    }
  }, [queue.length, loading, completed, totalItems, language, unit, startAt, wrongCount, retryCount, message]);

  const currentItem = queue[0];
  const currentQuestion = currentItem ? questions[currentItem.questionIndex] : undefined;
  const hiddenKeyword =
    currentQuestion && currentQuestion.keywords ? currentQuestion.keywords[currentItem.keywordIndex] : '';
  const statementParts = splitStatementWithBlank(currentQuestion?.statement || '', hiddenKeyword);
  const inputWidth = Math.min(Math.max((hiddenKeyword?.length || 3) * 14, 160), 360);

  useEffect(() => {
    setFeedback(undefined);
  }, [currentItem?.questionIndex, currentItem?.keywordIndex]);

  if (!languageNode || !unit) {
    return <Alert type="error" showIcon message="未找到语言或单元" />;
  }

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: '60vh' }}>
        <Spin tip="加载进度..." />
      </Flex>
    );
  }

  if (questions.length === 0) {
    return <Alert type="warning" message="该单元没有有效题目" showIcon />;
  }

  if (totalItems === 0) {
    return <Alert type="warning" message="该单元没有可练习的关键词" showIcon />;
  }

  if (completed || isUnitMastered(questions, masteredMap)) {
    return (
      <Result
        status="success"
        title="单元完成"
        subTitle="所有关键词都已掌握，继续保持！"
        extra={
          <Space>
            <Button type="primary" onClick={() => navigate(`/units/${language}`)}>
              返回单元列表
            </Button>
            <Button onClick={() => navigate('/')}>切换语言</Button>
          </Space>
        }
      />
    );
  }

  const handleSubmit = async (asSkip = false) => {
    if (!currentItem || !currentQuestion || locked) return;
    const normalized = answer.trim();
    const isCorrect = !asSkip && normalized === hiddenKeyword;
    setSubmitting(true);
    const restQueue = queue.slice(1);
    if (isCorrect) {
      const nextMastered = markMastered(masteredMap, currentItem);
      setMasteredMap(nextMastered);
      setQueue(restQueue);
      setFeedback({ status: 'correct', answer: hiddenKeyword });
      setAnswer('');
      setShowStatement(false);
    } else {
      setWrongCount((w) => w + 1);
      setRetryCount((r) => r + 1);
      const nextQueue = requeueItem(restQueue, currentItem);
      setPendingQueue(nextQueue);
      setLocked(true);
      setFeedback({ status: 'wrong', answer: hiddenKeyword, statement: currentQuestion.statement });
      setAnswer('');
      setShowStatement(false);
    }
    setSubmitting(false);
  };

  const handleNext = () => {
    if (pendingQueue) {
      setQueue(pendingQueue);
      setPendingQueue(null);
    } else {
      setQueue((q) => q.slice(1));
    }
    setLocked(false);
    setFeedback(undefined);
    setAnswer('');
    setShowStatement(false);
  };

  const mastered = masteredCount(masteredMap);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Flex justify="space-between" align="center">
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>
            {unit}
          </Title>
          <Text type="secondary">语言：{language} · 键盘提示：{languageNode.keyboard}</Text>
        </div>
        <Space size="large">
          <div>
            <Text type="secondary">进度</Text>
            <Progress
              percent={totalItems ? Math.round((mastered / totalItems) * 100) : 0}
              size="small"
              style={{ width: 200, marginBottom: 12 }}
            />
            <Text type="secondary" style={{ display: 'block', marginTop: 10 }}>
              {mastered}/{totalItems} 已掌握
            </Text>
          </div>
          <Badge color="orange" text={`剩余 ${queue.length}`} />
        </Space>
      </Flex>

      {currentQuestion && (
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Text type="secondary">题目</Text>
            <Title level={4} style={{ margin: 0 }}>
              {currentQuestion.translate}
            </Title>
            <Text type="secondary">填空</Text>
            <div className="quiz-statement">
              <Text className="quiz-statement-text">{statementParts.before}</Text>
              <Input
                value={answer}
                autoFocus
                onChange={(e) => setAnswer(e.target.value)}
                onPressEnter={() => handleSubmit(false)}
                placeholder="请输入缺失关键词"
                lang={language}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                inputMode="text"
                style={{ width: inputWidth }}
                disabled={locked}
              />
              <Text className="quiz-statement-text">{statementParts.after}</Text>
            </div>
            {showStatement && (
              <Alert
                type="info"
                message="原句"
                description={currentQuestion.statement}
                showIcon
              />
            )}
            {feedback && (
              <Alert
                type={feedback.status === 'correct' ? 'success' : 'error'}
                showIcon
                message={feedback.status === 'correct' ? '正确' : '错误'}
                description={
                  feedback.status === 'correct'
                    ? '做得好，继续下一题'
                    : (
                        <Space direction="vertical">
                          <Text>正确答案：{feedback.answer}</Text>
                          {feedback.statement && <Text type="secondary">原句：{feedback.statement}</Text>}
                        </Space>
                      )
                }
              />
            )}
            <Flex gap={8}>
              <Button
                type="primary"
                onClick={() => handleSubmit(false)}
                loading={submitting}
                disabled={(!answer && !submitting) || locked}
              >
                提交
              </Button>
              <Button onClick={() => handleSubmit(true)} disabled={submitting || locked}>
                我不会/跳过
              </Button>
              {locked && pendingQueue && (
                <Button type="dashed" onClick={handleNext}>
                  下一题
                </Button>
              )}
              <Button type="link" onClick={() => setShowStatement((v) => !v)}>
                {showStatement ? '隐藏原句' : '显示原句'}
              </Button>
            </Flex>
          </Space>
        </Card>
      )}
    </Space>
  );
};

export default QuizPage;
