// Run after npm install: node tests/check_typescript_syntax.mjs
import fs from 'node:fs';
import ts from 'typescript';
const files = [
  'src/main.tsx','src/i18n.ts','src/types.ts','src/AdminStudio.tsx',
  'functions/_shared.ts','functions/_password_auth.ts','functions/api/site.ts',
  'functions/api/admin/site.ts','functions/api/admin/content.ts',
  'functions/api/admin/upload.ts','functions/api/admin/integrations.ts',
  'functions/api/admin/facebook-sync.ts','functions/api/admin/auth/config.ts',
  'functions/api/admin/auth/login.ts','functions/api/admin/auth/session.ts',
  'functions/api/admin/auth/logout.ts','functions/api/media/[[key]].ts'
];
let errors = 0;
for (const file of files) {
  const result = ts.transpileModule(fs.readFileSync(file,'utf8'), {
    fileName:file, reportDiagnostics:true,
    compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}
  });
  for (const diagnostic of result.diagnostics || []) {
    errors++;
    console.error(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText,' ')}`);
  }
}
if (errors) process.exit(1);
console.log('PASS: All TypeScript/TSX files parse without syntax diagnostics');
