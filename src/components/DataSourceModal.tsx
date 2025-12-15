import React, { useState } from 'react';
import { Alert, Form, Input, Modal } from 'antd';
import { DataServiceError } from '../services/dataService';

interface Props {
  open: boolean;
  loading?: boolean;
  initialUrl?: string;
  closable?: boolean;
  onSubmit: (url: string) => Promise<void>;
  onCancel?: () => void;
}

const RAW_PATTERN = /^https:\/\/raw\.githubusercontent\.com\/.+/i;

export const DataSourceModal: React.FC<Props> = ({
  open,
  loading,
  initialUrl,
  closable,
  onSubmit,
  onCancel
}) => {
  const [form] = Form.useForm<{ url: string }>();
  const [error, setError] = useState<string>();

  const handleOk = async () => {
    try {
      setError(undefined);
      const values = await form.validateFields();
      await onSubmit(values.url.trim());
    } catch (err) {
      if (err instanceof DataServiceError) {
        setError(err.message);
      } else if (err instanceof Error && !('errorFields' in (err as unknown as Record<string, unknown>))) {
        setError(err.message);
      }
    }
  };

  return (
    <Modal
      title="配置数据源"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      closable={closable}
      maskClosable={false}
      confirmLoading={loading}
      okText="验证并加载"
      cancelText="取消"
      destroyOnClose
    >
      <p>请输入 raw.githubusercontent.com 上的 JSON 链接。</p>
      {error && (
        <Alert
          message={error}
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
        />
      )}
      <Form form={form} layout="vertical" initialValues={{ url: initialUrl || '' }}>
        <Form.Item
          name="url"
          label="数据源 URL"
          rules={[
            { required: true, message: '请输入链接' },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                if (!RAW_PATTERN.test(value.trim())) {
                  return Promise.reject(new Error('仅支持 https://raw.githubusercontent.com/... 链接'));
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <Input placeholder="https://raw.githubusercontent.com/xxx/words.json" />
        </Form.Item>
      </Form>
    </Modal>
  );
};
