import React, { useState } from 'react';
import { App as AntdApp, Button, Card, Input, Space, Typography } from 'antd';
import { useDatasetContext } from '../contexts/DatasetContext';
import { clearStore } from '../services/db';
import { clearStats } from '../services/statsService';

const { Title, Text } = Typography;

const SettingsPage: React.FC = () => {
  const { message } = AntdApp.useApp();
  const { datasetUrl, load, refreshing, clear } = useDatasetContext();
  const [url, setUrl] = useState(datasetUrl || '');

  const handleSave = async () => {
    try {
      await load(url);
      message.success('数据源已更新');
    } catch (err) {
      message.error((err as Error).message || '保存失败');
    }
  };

  const handleClearProgress = async () => {
    await clearStore('progress');
    message.success('已清空练习进度');
  };

  const handleClearStats = async () => {
    await clearStats();
    message.success('已清空统计数据');
  };

  const handleClearCache = async () => {
    await clear();
    message.success('已删除数据源缓存');
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ marginBottom: 0 }}>
        设置
      </Title>
      <Card title="数据源链接">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">仅支持 raw.githubusercontent.com</Text>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://raw.githubusercontent.com/xxx/words.json"
          />
          <Space>
            <Button type="primary" onClick={handleSave} loading={refreshing}>
              验证并保存
            </Button>
            <Button onClick={() => setUrl(datasetUrl || '')}>恢复当前值</Button>
          </Space>
        </Space>
      </Card>

      <Card title="数据与缓存">
        <Space>
          <Button onClick={handleClearProgress} danger>
            清空练习进度
          </Button>
          <Button onClick={handleClearStats} danger>
            清空统计记录
          </Button>
          <Button onClick={handleClearCache} danger>
            清除数据源缓存
          </Button>
        </Space>
      </Card>
    </Space>
  );
};

export default SettingsPage;
