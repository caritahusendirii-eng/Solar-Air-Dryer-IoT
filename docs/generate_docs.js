const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
               hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
               '</code></pre>';
      } catch (__) {}
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  }
});

const filesToConvert = [
  'Lampiran_A1_Kode_Sumber.md',
  'Lampiran_A2_Kode_Sumber.md',
  'Lampiran_A3_Kode_Sumber.md',
  'Lampiran_B_Fungsi_Fitur.md',
  'Lampiran_C_Step_by_Step.md'
];

const cssStyles = `
<style>
  body { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 2rem; }
  h1, h2, h3 { color: #1e3a8a; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem; margin-top: 2rem; }
  pre { background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 13px; font-family: Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace; }
  code { font-family: Consolas, Monaco, "Andale Mono", monospace; background: #f3f4f6; padding: 0.2rem 0.4rem; border-radius: 4px; color: #be185d; font-size: 0.9em; }
  pre code { background: none; padding: 0; color: inherit; }
  table { width: 100%; border-collapse: collapse; margin-top: 1rem; margin-bottom: 1rem; }
  th, td { border: 1px solid #d1d5db; padding: 0.75rem; text-align: left; }
  th { background-color: #f3f4f6; font-weight: 600; }
  tr:nth-child(even) { background-color: #f9fafb; }
  .hljs-keyword { color: #569cd6; font-weight: bold; }
  .hljs-string { color: #ce9178; }
  .hljs-number { color: #b5cea8; }
  .hljs-built_in { color: #4ec9b0; }
  .hljs-comment { color: #6a9955; font-style: italic; }
  .hljs-title { color: #dcdcaa; }
</style>
`;

// Helper to replace code blocks in MD files
function replaceCodeBlock(mdContent, lang, keyword, newCode) {
  const regex = new RegExp('```' + lang + '[\\s\\S]*?(?=```)```', 'g');
  let matchCount = 0;
  
  return mdContent.replace(regex, (match) => {
    if (match.includes(keyword)) {
      matchCount++;
      return '\`\`\`' + lang + '\\n' + newCode + '\\n\`\`\`';
    }
    return match;
  });
}

const basePath = path.join(__dirname, '..');
const docsPath = __dirname;
const outPath = path.join(docsPath, 'output');

// Read source files
const smartAcCode = fs.readFileSync(path.join(basePath, 'esp32/smart_ac.ino'), 'utf8');
const appJsxCode = fs.readFileSync(path.join(basePath, 'react-dashboard/src/App.jsx'), 'utf8');
const appCssCode = fs.readFileSync(path.join(basePath, 'react-dashboard/src/App.css'), 'utf8');
const fbServiceCode = fs.readFileSync(path.join(basePath, 'flutter_dashboard/lib/services/firebase_service.dart'), 'utf8');
const dashScreenCode = fs.readFileSync(path.join(basePath, 'flutter_dashboard/lib/screens/dashboard_screen.dart'), 'utf8');
const blowerCtrlCode = fs.readFileSync(path.join(basePath, 'flutter_dashboard/lib/widgets/blower_control.dart'), 'utf8');

// Update A1
let a1 = fs.readFileSync(path.join(docsPath, 'Lampiran_A1_Kode_Sumber.md'), 'utf8');
a1 = replaceCodeBlock(a1, 'cpp', 'SOLAR DRYER IOT', smartAcCode);
fs.writeFileSync(path.join(docsPath, 'Lampiran_A1_Kode_Sumber.md'), a1);

// Update A2
let a2 = fs.readFileSync(path.join(docsPath, 'Lampiran_A2_Kode_Sumber.md'), 'utf8');
a2 = replaceCodeBlock(a2, 'javascript', 'import React', appJsxCode);
a2 = replaceCodeBlock(a2, 'css', '.app-container', appCssCode);
fs.writeFileSync(path.join(docsPath, 'Lampiran_A2_Kode_Sumber.md'), a2);

// Update A3
let a3 = fs.readFileSync(path.join(docsPath, 'Lampiran_A3_Kode_Sumber.md'), 'utf8');
a3 = replaceCodeBlock(a3, 'dart', 'class FirebaseService', fbServiceCode);
a3 = replaceCodeBlock(a3, 'dart', 'class DashboardScreen', dashScreenCode);
a3 = replaceCodeBlock(a3, 'dart', 'class BlowerControl', blowerCtrlCode);
fs.writeFileSync(path.join(docsPath, 'Lampiran_A3_Kode_Sumber.md'), a3);

// Generate HTML
for (const file of filesToConvert) {
  const mdContent = fs.readFileSync(path.join(docsPath, file), 'utf8');
  const htmlContent = md.render(mdContent);
  const title = file.replace('.md', '').replace(/_/g, ' ');
  
  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  ${cssStyles}
</head>
<body>
  ${htmlContent}
</body>
</html>`;

  fs.writeFileSync(path.join(outPath, file.replace('.md', '.html')), fullHtml);
  console.log('Generated: ' + file.replace('.md', '.html'));
}
