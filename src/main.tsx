import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { DatasetProvider } from './contexts/DatasetContext';
import './styles/index.css';

registerSW({ immediate: true });

const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 8
          }
        }}
      >
        <AntdApp>
          <BrowserRouter>
            <DatasetProvider>
              <App />
            </DatasetProvider>
          </BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </React.StrictMode>
  );
}
