import { build } from 'esbuild';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { existsSync } from 'node:fs';

// Compila os componentes reais. Apenas autenticação, rede e decoração do shell
// são substituídas; importação, armazenamento, formulários e efeitos são reais.
export async function loadSharingApp() {
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const output = path.join(root, 'artifacts/sharing-tests/app.mjs');
  const mocks = {
    'shared/auth/authService': `export const usesSupabaseAuth = true;
      export const subscribeToAuth = callback => { globalThis.sharingTest.authCallback = callback;
        callback(globalThis.sharingTest.userContext.user); return () => {}; };`,
    'shared/supabase/client': `export const getSupabaseClient = () => globalThis.sharingTest.client;`,
    'shared/firebase/firebase': `export const db = null;`,
    'shared/api/backend': `export const callBackend = () => { throw new Error('Unexpected Firebase call'); };`,
    'shared/hooks/useUser': `export const useUser = () => globalThis.sharingTest.userContext;`,
    'features/auth/LoginPage': `import React from 'react'; export default function Login({ sharedSelectionPath }) {
      return React.createElement('div', { 'data-login-path': sharedSelectionPath }, 'Entrar com Google');
    }`,
    'features/desktop/useDesktopLayout': `export const useDesktopLayout = () => false;`,
    'features/candidate-selection/candidateService': `
      export const enrichCandidatesWithPartyScores = async items => items;
      export const fetchCandidatesByOffice = async () => globalThis.sharingTest.candidates;
      export const fetchCandidateTallies = async () => new Map();
      export const readCachedCandidatesByOffice = () => null;
      export const readCachedTallies = () => new Map();
      export const invalidateCandidateTalliesCache = () => {};
      export const invalidateStateChoiceCountsCache = () => {};
    `,
    'features/sharing/shareCardService': `export const APP_SHARE_URL = 'https://example.test';`,
  };
  for (const name of ['shared/ui/layout/AppHeader', 'shared/ui/layout/AppFooter',
    'app/shell/BottomNavigation', 'shared/ui/feedback/TourModal',
    'features/desktop/DesktopCandidateSelection']) mocks[name] = 'export default () => null;';

  await build({
    absWorkingDir: root, bundle: true, format: 'esm', platform: 'node',
    packages: 'external', jsx: 'automatic', outfile: output,
    define: { 'import.meta.env': '{}' },
    stdin: { resolveDir: root, contents: `
      export { default as SharedSelectionPage } from './src/features/sharing/SharedSelectionPage.jsx';
      export { default as CandidateSelectionPage } from './src/features/candidate-selection/CandidateSelectionPage.jsx';
      export { default as ShareChoicePanel } from './src/features/sharing/ShareChoicePanel.jsx';
      export { UserProvider } from './src/app/providers/UserProvider.jsx';
      export * from './src/features/ballot/index.js';
      export * from './src/features/sharing/sharedSelectionModel.js';
      export * from './src/features/sharing/sharedSelectionService.js';
    ` },
    plugins: [{ name: 'sharing-test-boundaries', setup(builder) {
      builder.onResolve({ filter: /.*/ }, (args) => {
        if (args.path.endsWith('.css')) return { path: args.path, namespace: 'empty' };
        if (args.path === 'firebase/firestore') return { path: 'firestore', namespace: 'mock' };
        if (args.path === 'qrcode') return { path: 'qrcode', namespace: 'mock' };
        const resolved = args.path.startsWith('@/')
          ? path.join(root, 'src', args.path.slice(2))
          : args.path.startsWith('.') ? path.resolve(args.resolveDir, args.path) : null;
        if (!resolved) return { path: args.path, external: true };
        const key = path.relative(path.join(root, 'src'), resolved).replaceAll('\\', '/').replace(/\.(jsx?|mjs)$/, '');
        if (key in mocks) return { path: key, namespace: 'mock' };
        if (args.path.startsWith('@/')) return { path: [resolved, `${resolved}.js`, `${resolved}.jsx`, path.join(resolved, 'index.js')]
          .find(file => path.extname(file) && existsSync(file)) || resolved };
      });
      builder.onLoad({ filter: /.*/, namespace: 'empty' }, () => ({ contents: '' }));
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path: name }) => ({ contents:
        name === 'firestore' ? 'export const collection = null, documentId = null, doc = null, getDoc = null, getDocs = null, query = null, where = null, onSnapshot = null;'
          : name === 'qrcode' ? `export default { toDataURL: async () => 'data:image/png;base64,YQ==' };`
            : mocks[name], loader: 'js',
      }));
    } }],
  });
  return import(pathToFileURL(output).href);
}
