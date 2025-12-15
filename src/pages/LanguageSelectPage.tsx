import React from 'react';
import { App as AntdApp, Card, Col, Empty, Flex, Row, Space, Tag, Typography, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useDatasetContext } from '../contexts/DatasetContext';
import { getLanguageNode } from '../services/dataService';

const { Title, Text } = Typography;

const LanguageSelectPage: React.FC = () => {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const { dataset, refreshing, datasetMeta, load } = useDatasetContext();

  if (!dataset) {
    return <Empty description="还没有数据集，请先配置数据源" />;
  }

  const handleRefresh = async () => {
    try {
      await load();
      message.success('已尝试更新数据源（网络优先）');
    } catch (err) {
      message.error((err as Error).message || '刷新失败，尝试使用缓存');
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Flex justify="space-between" align="center">
        <div>
          <Title level={3} style={{ marginBottom: 0 }}>
            选择语言
          </Title>
          <Text type="secondary">
            最后更新：{datasetMeta?.lastSuccessAt ? new Date(datasetMeta.lastSuccessAt).toLocaleString() : '无记录'}
          </Text>
        </div>
        <Button onClick={handleRefresh} loading={refreshing} type="default">
          刷新数据
        </Button>
      </Flex>
      <Row gutter={[16, 16]}>
        {dataset.language.map((code) => {
          const node = getLanguageNode(dataset, code);
          return (
            <Col xs={24} sm={12} md={8} key={code}>
              <Card
                hoverable
                onClick={() => navigate(`/units/${code}`)}
                title={`语言：${code}`}
                extra={<Tag color="blue">{node?.keyboard}</Tag>}
              >
                <Text>点击进入该语言的单元列表</Text>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Space>
  );
};

export default LanguageSelectPage;
