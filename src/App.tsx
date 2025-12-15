import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Flex,
  Layout,
  Menu,
  Spin,
  Typography,
  App as AntdApp
} from 'antd';
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DataSourceModal } from './components/DataSourceModal';
import { useDatasetContext } from './contexts/DatasetContext';
import { DataServiceError } from './services/dataService';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import LanguageSelectPage from './pages/LanguageSelectPage';
import UnitSelectPage from './pages/UnitSelectPage';
import QuizPage from './pages/QuizPage';
import StatsPage from './pages/StatsPage';
import SettingsPage from './pages/SettingsPage';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const online = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();
  const { datasetUrl, refreshing, dataset } = useDatasetContext();

  const menuKey = useMemo(() => {
    if (location.pathname.startsWith('/stats')) return '/stats';
    if (location.pathname.startsWith('/settings')) return '/settings';
    return '/';
  }, [location.pathname]);

  return (
    <Layout className="app-shell">
      <Header style={{ display: 'flex', alignItems: 'center', paddingInline: 24 }}>
        <Flex align="center" style={{ gap: 12, flex: '0 0 auto' }}>
          <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>
            <Title level={4} style={{ color: '#fff', margin: 0 }}>
              Word PWA
            </Title>
          </Link>
          <Badge
            status={online ? 'success' : 'default'}
            text={online ? '在线' : '离线'}
            style={{ color: '#fff' }}
          />
        </Flex>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[menuKey]}
          style={{ marginLeft: 24, flex: 1 }}
          onClick={({ key }) => navigate(key)}
          items={[
            { key: '/', label: '语言' },
            { key: '/stats', label: '统计' },
            { key: '/settings', label: '设置' }
          ]}
        />
        {dataset && (
          <Text style={{ color: '#d6e4ff', marginLeft: 12 }} ellipsis>
            数据源: {datasetUrl || '未配置'}
            {refreshing ? '（更新中）' : ''}
          </Text>
        )}
      </Header>
      <Content className="content-wrapper">{children}</Content>
    </Layout>
  );
};

const App: React.FC = () => {
  const { message } = AntdApp.useApp();
  const { dataset, datasetUrl, loading, refreshing, error, load } = useDatasetContext();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!dataset || (error instanceof DataServiceError && error.code === 'NO_URL')) {
        setModalOpen(true);
      }
    }
  }, [dataset, error, loading]);

  const handleLoadDataset = async (url: string) => {
    try {
      await load(url);
      setModalOpen(false);
      message.success('数据源已加载');
    } catch (err) {
      message.error((err as Error).message || '加载失败，请检查链接');
    }
  };

  return (
    <>
      <AppLayout>
        {loading ? (
          <Flex justify="center" align="center" style={{ minHeight: '60vh' }}>
            <Spin tip="加载中..." />
          </Flex>
        ) : dataset ? (
          <Routes>
            <Route path="/" element={<LanguageSelectPage />} />
            <Route path="/units/:language" element={<UnitSelectPage />} />
            <Route path="/quiz/:language/:unit" element={<QuizPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<LanguageSelectPage />} />
          </Routes>
        ) : (
          <Alert
            type="warning"
            showIcon
            message="需要配置数据源"
            description="请输入 raw github JSON 链接以开始使用。"
          />
        )}
      </AppLayout>
      <DataSourceModal
        open={modalOpen}
        loading={refreshing}
        initialUrl={datasetUrl}
        closable={!!dataset}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleLoadDataset}
      />
    </>
  );
};

export default App;
