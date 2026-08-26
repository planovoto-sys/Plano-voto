import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const TEXT_EXTENSIONS = new Set([
  '.css', '.env', '.html', '.js', '.jsx', '.json', '.md', '.mjs', '.rules', '.toml', '.ts', '.tsx', '.yml', '.yaml'
]);
const EXCLUDED_FILES = new Set([
  'package-lock.json',
  'functions/package-lock.json',
  '.env.example',
  'scripts/security-audit.mjs'
]);
const CURRENT_PATTERNS = [
  { name: 'private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u },
  { name: 'AWS access key', regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u },
  { name: 'GitHub token', regex: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/u },
  { name: 'Slack token', regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/u },
  { name: 'credential assignment', regex: /\b(?:client_secret|api_secret|private_key|password|passwd|access_token)\s*[:=]\s*["'][^"']{8,}["']/iu }
];
const HISTORY_PATTERNS = [
  'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY',
  '(AKIA|ASIA)[A-Z0-9]{16}',
  'gh[pousr]_[A-Za-z0-9_]{30,}',
  'xox[baprs]-[A-Za-z0-9-]{20,}',
  "(client_secret|api_secret|private_key|password|passwd|access_token)[[:space:]]*[:=][[:space:]]*[\"'][^\"']{8,}[\"']"
];

const trackedFiles = execFileSync('git', [
  'ls-files', '--cached', '--others', '--exclude-standard', '-z'
], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .filter((file) => !EXCLUDED_FILES.has(file))
  .filter((file) => TEXT_EXTENSIONS.has(extname(file)) || file.endsWith('.rules'));

const findings = [];
for (const file of trackedFiles) {
  const content = readFileSync(file, 'utf8');
  for (const pattern of CURRENT_PATTERNS) {
    if (pattern.regex.test(content)) findings.push(`${file}: ${pattern.name}`);
  }
}

for (const pattern of HISTORY_PATTERNS) {
  const output = execFileSync('git', [
    '--no-pager', 'log', '--all', '--no-ext-diff', '--no-textconv', '-G', pattern,
    '--format=%H', '--name-only', '--', '*.js', '*.jsx', '*.json', '*.mjs', '*.env*', '*.yml', '*.yaml',
    ':!scripts/security-audit.mjs', ':!package-lock.json', ':!functions/package-lock.json'
  ], { encoding: 'utf8' }).trim();
  if (output) findings.push(`historico Git: padrao confidencial detectado (${pattern.split('[')[0]})`);
}

if (findings.length > 0) {
  console.error('Possiveis segredos encontrados:');
  [...new Set(findings)].forEach((finding) => console.error(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log(`Auditoria concluida: ${trackedFiles.length} arquivos versionaveis e o historico Git nao contem segredos de alta confianca.`);
}
