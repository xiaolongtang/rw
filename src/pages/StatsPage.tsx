import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Card,
  Col,
  Drawer,
  List,
  Row,
  Space,
  Statistic,
  Tag,
  Typography
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { listSessions, sessionsByDate } from '../services/statsService';
import { SessionRecord } from '../domain/types';

const { Title, Text } = Typography;

function calcStreak(sessions: SessionRecord[]) {
  const dates = new Set(sessions.map((s) => s.date));
  let streak = 0;
  let cursor = dayjs();
  while (dates.has(cursor.format('YYYY-MM-DD'))) {
    streak += 1;
    cursor = cursor.subtract(1, 'day');
  }
  return streak;
}

function heatColor(count: number) {
  if (count === 0) return '#f0f0f0';
  if (count === 1) return '#bae0ff';
  if (count === 2) return '#69b1ff';
  return '#1677ff';
}

const StatsPage: React.FC = () => {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>();
  const [detailSessions, setDetailSessions] = useState<SessionRecord[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    listSessions().then(setSessions);
  }, []);

  const today = dayjs().format('YYYY-MM-DD');
  const todaySessions = sessions.filter((s) => s.date === today);
  const streak = useMemo(() => calcStreak(sessions), [sessions]);
  const totalDuration = sessions.reduce((acc, cur) => acc + (cur.durationSec || 0), 0);

  const calendarMap = useMemo(() => {
    return sessions.reduce<Record<string, number>>((acc, cur) => {
      acc[cur.date] = (acc[cur.date] || 0) + 1;
      return acc;
    }, {});
  }, [sessions]);

  const onSelect = async (value: Dayjs) => {
    const date = value.format('YYYY-MM-DD');
    setSelectedDate(date);
    const list = await sessionsByDate(date);
    setDetailSessions(list);
    setDrawerOpen(true);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={3} style={{ marginBottom: 0 }}>
        统计与打卡
      </Title>
      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="今日打卡" value={todaySessions.length} suffix="次" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="连续打卡" value={streak} suffix="天" />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic title="累计单元完成" value={sessions.length} suffix="次" />
            <Text type="secondary">
              共计 {(totalDuration / 60).toFixed(1)} 分钟
            </Text>
          </Card>
        </Col>
      </Row>

      <Card title="打卡日历">
        <Calendar
          fullscreen={false}
          onSelect={onSelect}
          dateCellRender={(value) => {
            const date = value.format('YYYY-MM-DD');
            const count = calendarMap[date] || 0;
            return <div className="heatmap-cell" style={{ backgroundColor: heatColor(count) }} />;
          }}
        />
      </Card>

      <Card title="最近记录">
        <List
          dataSource={sessions.slice(0, 20)}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical">
                <Space>
                  <Tag color="blue">{item.languageCode}</Tag>
                  <Tag color="green">{item.unitName}</Tag>
                  <Text type="secondary">{item.date}</Text>
                </Space>
                <Text>
                  用时 {item.durationSec}s · 错误 {item.wrongCount} 次
                </Text>
              </Space>
            </List.Item>
          )}
        />
      </Card>

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedDate ? `${selectedDate} 详情` : '详情'}
        width={400}
      >
        <List
          dataSource={detailSessions}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical">
                <Space>
                  <Tag color="blue">{item.languageCode}</Tag>
                  <Tag color="green">{item.unitName}</Tag>
                </Space>
                <Text>用时 {(item.durationSec / 60).toFixed(1)} 分钟</Text>
                <Text type="secondary">错误 {item.wrongCount} 次</Text>
              </Space>
            </List.Item>
          )}
        />
      </Drawer>
    </Space>
  );
};

export default StatsPage;
