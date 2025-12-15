import { Dataset, DatasetMeta, LanguageNode, Question, UnitDefinition } from '../domain/types';
import { deleteKV, getKV, setKV } from './db';

export class DataServiceError extends Error {
  code: 'NO_URL' | 'INVALID_URL' | 'FETCH_FAILED' | 'INVALID_DATA';

  constructor(code: DataServiceError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

const DATASET_URL_KEY = 'datasetUrl';
const DATASET_JSON_KEY = 'datasetJson';
const DATASET_META_KEY = 'datasetMeta';
const NETWORK_TIMEOUT = 8000;

export const dataKeys = {
  url: DATASET_URL_KEY,
  json: DATASET_JSON_KEY,
  meta: DATASET_META_KEY
};

function assertRawGithubUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      throw new DataServiceError('INVALID_URL', '请使用 https 链接');
    }
    if (!parsed.hostname.includes('raw.githubusercontent.com')) {
      throw new DataServiceError(
        'INVALID_URL',
        '仅支持 raw.githubusercontent.com 的链接以保证安全'
      );
    }
  } catch (err) {
    if (err instanceof DataServiceError) {
      throw err;
    }
    throw new DataServiceError('INVALID_URL', '数据源链接不合法');
  }
}

function withTimeout(signal: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  signal.addEventListener('abort', () => controller.abort(), { once: true });
  return { signal: controller.signal, cancel: () => clearTimeout(timer) };
}

function ensureQuestion(q: Question, idx: number) {
  if (
    typeof q.statement !== 'string' ||
    typeof q.translate !== 'string' ||
    !Array.isArray(q.keywords)
  ) {
    throw new DataServiceError('INVALID_DATA', `题目 ${idx + 1} 格式不正确`);
  }
}

function ensureLanguageNode(node: LanguageNode, code: string) {
  if (!node || typeof node !== 'object') {
    throw new DataServiceError('INVALID_DATA', `语言 ${code} 缺少节点`);
  }
  if (typeof node.keyboard !== 'string') {
    throw new DataServiceError('INVALID_DATA', `${code} 的 keyboard 字段缺失`);
  }
  if (!Array.isArray(node.Unit)) {
    throw new DataServiceError('INVALID_DATA', `${code} 的 Unit 应为数组`);
  }
}

export function parseUnits(languageNode: LanguageNode): UnitDefinition[] {
  const units: UnitDefinition[] = [];
  languageNode.Unit.forEach((unitObj) => {
    Object.entries(unitObj).forEach(([name, questions]) => {
      if (Array.isArray(questions)) {
        units.push({ name, questions });
      }
    });
  });
  return units;
}

export function validateDatasetJson(json: unknown): Dataset {
  if (!json || typeof json !== 'object') {
    throw new DataServiceError('INVALID_DATA', 'JSON 根节点应为对象');
  }
  const dataset = json as Dataset;
  if (!Array.isArray(dataset.language) || dataset.language.length === 0) {
    throw new DataServiceError('INVALID_DATA', 'language 字段缺失或格式不正确');
  }
  dataset.language.forEach((lang) => {
    if (typeof lang !== 'string') {
      throw new DataServiceError('INVALID_DATA', 'language 列表应为字符串数组');
    }
    const node = (dataset as Record<string, LanguageNode>)[lang];
    ensureLanguageNode(node, lang);
    node.Unit.forEach((u, unitIdx) => {
      const entries = Object.entries(u);
      if (entries.length === 0) {
        throw new DataServiceError('INVALID_DATA', `${lang} 第 ${unitIdx + 1} 个 Unit 为空`);
      }
      entries.forEach(([unitName, questions]) => {
        if (!Array.isArray(questions)) {
          throw new DataServiceError(
            'INVALID_DATA',
            `${lang} 单元 ${unitName} 的题目列表必须是数组`
          );
        }
        questions.forEach((q, idx) => ensureQuestion(q, idx));
      });
    });
  });
  return dataset;
}

async function fetchDataset(url: string): Promise<Dataset> {
  assertRawGithubUrl(url);
  const controller = new AbortController();
  const { signal, cancel } = withTimeout(controller.signal, NETWORK_TIMEOUT);
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new DataServiceError('FETCH_FAILED', `请求失败：${res.status}`);
    }
    const json = (await res.json()) as unknown;
    return validateDatasetJson(json);
  } catch (err) {
    if (err instanceof DataServiceError) {
      throw err;
    }
    if ((err as Error).name === 'AbortError') {
      throw new DataServiceError('FETCH_FAILED', '请求超时');
    }
    throw new DataServiceError('FETCH_FAILED', '网络请求失败');
  } finally {
    cancel();
  }
}

async function writeCache(url: string, dataset: Dataset, meta: DatasetMeta) {
  await Promise.all([
    setKV(DATASET_URL_KEY, url),
    setKV(DATASET_JSON_KEY, dataset),
    setKV(DATASET_META_KEY, meta)
  ]);
}

async function readCache() {
  const [url, dataset, meta] = await Promise.all([
    getKV<string>(DATASET_URL_KEY),
    getKV<Dataset>(DATASET_JSON_KEY),
    getKV<DatasetMeta>(DATASET_META_KEY)
  ]);
  return { url, dataset, meta };
}

export async function clearDatasetCache() {
  await Promise.all([
    deleteKV(DATASET_URL_KEY),
    deleteKV(DATASET_JSON_KEY),
    deleteKV(DATASET_META_KEY)
  ]);
}

export async function loadDataset(preferredUrl?: string) {
  const { url: cachedUrl, dataset: cachedDataset, meta } = await readCache();
  const targetUrl = preferredUrl || cachedUrl;

  if (!targetUrl) {
    if (cachedDataset) {
      return {
        dataset: cachedDataset,
        url: cachedUrl,
        source: 'cache' as const,
        meta
      };
    }
    throw new DataServiceError('NO_URL', '请先配置 raw github 数据源链接');
  }

  try {
    const dataset = await fetchDataset(targetUrl);
    const nextMeta: DatasetMeta = { lastSuccessAt: Date.now() };
    await writeCache(targetUrl, dataset, nextMeta);
    return {
      dataset,
      url: targetUrl,
      source: 'network' as const,
      meta: nextMeta
    };
  } catch (err) {
    if (cachedDataset) {
      return {
        dataset: cachedDataset,
        url: targetUrl,
        source: 'cache' as const,
        meta,
        error: err as Error
      };
    }
    throw err;
  }
}

export async function bootstrapDataset() {
  return loadDataset();
}

export function getLanguageNode(dataset: Dataset, code: string): LanguageNode | undefined {
  const node = (dataset as Record<string, LanguageNode | string[]>)[code];
  if (node && !Array.isArray(node)) {
    return node as LanguageNode;
  }
  return undefined;
}

export function findUnit(languageNode: LanguageNode, unitName: string): Question[] | undefined {
  for (const u of languageNode.Unit) {
    const entry = Object.entries(u).find(([name]) => name === unitName);
    if (entry) {
      return entry[1];
    }
  }
  return undefined;
}
