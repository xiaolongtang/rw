import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Dataset, DatasetMeta } from '../domain/types';
import { bootstrapDataset, clearDatasetCache, DataServiceError, loadDataset } from '../services/dataService';

interface DatasetContextValue {
  dataset?: Dataset;
  datasetUrl?: string;
  datasetMeta?: DatasetMeta;
  loading: boolean;
  refreshing: boolean;
  error?: Error;
  load: (url?: string) => Promise<void>;
  clear: () => Promise<void>;
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

export const DatasetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dataset, setDataset] = useState<Dataset>();
  const [datasetUrl, setDatasetUrl] = useState<string>();
  const [datasetMeta, setDatasetMeta] = useState<DatasetMeta>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error>();

  const syncDataset = useCallback(
    async (url?: string) => {
      setRefreshing(true);
      setError(undefined);
      try {
        const result = await loadDataset(url);
        setDataset(result.dataset);
        setDatasetUrl(result.url);
        setDatasetMeta(result.meta);
        if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  const clear = useCallback(async () => {
    await clearDatasetCache();
    setDataset(undefined);
    setDatasetUrl(undefined);
    setDatasetMeta(undefined);
  }, []);

  useEffect(() => {
    bootstrapDataset()
      .then((result) => {
        setDataset(result.dataset);
        setDatasetUrl(result.url);
        setDatasetMeta(result.meta);
        if (result.error) {
          setError(result.error);
        }
      })
      .catch((err) => {
        setError(err as Error);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      dataset,
      datasetUrl,
      datasetMeta,
      loading,
      refreshing,
      error,
      load: syncDataset,
      clear
    }),
    [dataset, datasetMeta, datasetUrl, loading, refreshing, error, syncDataset, clear]
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
};

export function useDatasetContext() {
  const ctx = useContext(DatasetContext);
  if (!ctx) {
    throw new DataServiceError('INVALID_DATA', 'Dataset context not found');
  }
  return ctx;
}
