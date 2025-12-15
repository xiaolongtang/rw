import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  App as AntdApp,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Space,
  Tag,
  Typography
} from 'antd';
import { useDatasetContext } from '../contexts/DatasetContext';
import { getLanguageNode, parseUnits } from '../services/dataService';
import { listProgressByLanguage, resetUnitProgress } from '../services/progressService';
import { masteredCount, getTotalItems } from '../domain/quiz';
import { UnitProgress } from '../domain/types';

const { Title, Text } = Typography;

const UnitSelectPage: React.FC = () => {
  const { language } = useParams<{ language: string }>();
  const navigate = useNavigate();
  const { dataset } = useDatasetContext();
  const { message } = AntdApp.useApp();
  const [progress, setProgress] = useState<UnitProgress[]>([]);

  useEffect(() => {
    if (language) {
      listProgressByLanguage(language).then(setProgress);
    }
  }, [language]);

  const languageNode = language && dataset ? getLanguageNode(dataset, language) : undefined;
  const units = useMemo(() => (languageNode ? parseUnits(languageNode) : []), [languageNode]);

  if (!languageNode || !language) {
    return <Empty description="未找到语言数据，请返回重试" />;
  }

  const progressMap = new Map(progress.map((p) => [p.unit, p]));

  const handleRestart = async (unitName: string) => {
    await resetUnitProgress(language, unitName);
    const next = await listProgressByLanguage(language);
    setProgress(next);
    message.success('已重置该单元进度');
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ marginBottom: 0 }}>
        选择单元（{language}）
      </Title>
      <Text type="secondary">键盘/语言提示：{languageNode.keyboard}</Text>
      <Row gutter={[16, 16]}>
        {units.map((unit) => {
          const unitProgress = progressMap.get(unit.name);
          const total = getTotalItems(unit.questions);
          const mastered = unitProgress ? masteredCount(unitProgress.masteredMap) : 0;
          const percent = total ? Math.min(100, Math.round((mastered / total) * 100)) : 0;
          const status = mastered >= total && total > 0 ? 'success' : 'active';
          return (
            <Col xs={24} sm={12} md={8} key={unit.name}>
              <Card
                title={unit.name}
                extra={status === 'success' ? <Tag color="green">已完成</Tag> : <Tag color="blue">未完成</Tag>}
                actions={[
                  <Button type="link" key="enter" onClick={() => navigate(`/quiz/${language}/${unit.name}`)}>
                    {status === 'success' ? '复习/再练一次' : '继续练习'}
                  </Button>,
                  <Button type="link" danger key="reset" onClick={() => handleRestart(unit.name)}>
                    重新开始
                  </Button>
                ]}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text>{unit.questions.length} 道题</Text>
                  <Progress percent={percent} status={status as any} />
                  <Badge status={status === 'success' ? 'success' : 'processing'} text={`${mastered}/${total} 已掌握`} />
                </Space>
              </Card>
            </Col>
          );
        })}
        {units.length === 0 && (
          <Col span={24}>
            <Empty description="未找到任何单元" />
          </Col>
        )}
      </Row>
    </Space>
  );
};

export default UnitSelectPage;
