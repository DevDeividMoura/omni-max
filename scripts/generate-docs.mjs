// scripts/generate-docs.mjs (v7 - Fonte Única de Verdade para i18n)
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { glob } from 'glob';

const CWD = process.cwd();
const GITHUB_RAW_BASE_URL = 'https://raw.githubusercontent.com/DevDeividMoura/omni-max/main';

const DOC_SOURCES = [
  {
    name: 'privacy-policy',
    sourceDir: 'docs/privacy_policy',
    outputDir: 'docs/public/privacy_policy',
    titlePrefix: 'Política de Privacidade'
  },
  {
    name: 'user-guide',
    sourceDir: 'docs/user_guide',
    outputDir: 'docs/public/user_guide',
    titlePrefix: 'Guia do Usuário'
  }
];

const TEMPLATES = {
  main: fs.readFileSync(path.resolve(CWD, 'scripts/templates/main.html'), 'utf-8'),
  header: fs.readFileSync(path.resolve(CWD, 'scripts/templates/header.html'), 'utf-8'),
  footer: fs.readFileSync(path.resolve(CWD, 'scripts/templates/footer.html'), 'utf-8'),
};

// [MUDANÇA] Aponta para a pasta de locales da aplicação principal
const translations = {};
const localeFiles = glob.sync('src/i18n/locales/*.json');
localeFiles.forEach(file => {
  const lang = path.basename(file, '.json').toLowerCase(); // Garante 'pt-br' minúsculo
  translations[lang] = JSON.parse(fs.readFileSync(file, 'utf-8'));
});
console.log('[I18N] Dicionários de tradução da aplicação carregados:', Object.keys(translations));

// [NOVO] Função auxiliar para buscar valores em objetos aninhados (ex: 'sidepanel.header.title')
function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((acc, part) => acc && acc[part], obj);
}

function getLangFromFile(filePath) {
  const fileName = path.basename(filePath, '.md');
  const parts = fileName.split('.');
  if (parts.length > 1) {
    let lang = parts.pop().toLowerCase();
    // Normaliza para o padrão do nosso arquivo JSON (pt-br)
    if (lang === 'pt-pt') lang = 'pt-br';
    return lang === 'pt-br' ? 'pt-br' : lang;
  }
  return 'en';
}

function rewriteMarkdownLinks(markdownContent) {
  return markdownContent.replace(/\[(.*?)\]\(\.\/([\w.-]+)\.md\)/g, (match, text, fileName) => {
    const langCode = getLangFromFile(fileName + '.md');
    return `[${text}](../${langCode}/)`;
  });
}

function rewriteAssetPaths(markdownContent, markdownFilePath) {
  const markdownDir = path.dirname(markdownFilePath);
  const markdownRegex = /(!?\[.*?\]\()(\.\.\/.*?)\)/g;
  let content = markdownContent.replace(markdownRegex, (match, start, relativePath) => {
    const fullAssetPath = path.resolve(markdownDir, relativePath);
    const projectRelativePath = path.relative(CWD, fullAssetPath).replace(/\\/g, '/');
    const absoluteUrl = `${GITHUB_RAW_BASE_URL}/${projectRelativePath}`;
    return `${start}${absoluteUrl})`;
  });

  const htmlRegex = /(src|href)=["'](\.\.\/.*?)["']/g;
  content = content.replace(htmlRegex, (match, attribute, relativePath) => {
    const fullAssetPath = path.resolve(markdownDir, relativePath);
    const projectRelativePath = path.relative(CWD, fullAssetPath).replace(/\\/g, '/');
    const absoluteUrl = `${GITHUB_RAW_BASE_URL}/${projectRelativePath}`;
    return `${attribute}="${absoluteUrl}"`;
  });
  return content;
}

function createLanguageSwitcher(docGroup, currentLang, baseOutputDir) {
  const links = Object.keys(docGroup.files).map(lang => {
    const relativePath = path.relative(path.join(baseOutputDir, currentLang), path.join(baseOutputDir, lang));
    if (lang === currentLang) {
      return `<span>${docGroup.files[lang].langDisplay}</span>`;
    }
    const finalPath = relativePath.replace(/\\/g, '/');
    return `<a href="${finalPath || '.'}/">${docGroup.files[lang].langDisplay}</a>`;
  });
  return links.join(' · ');
}

function generateDocs() {
  console.log('🚀 Iniciando a geração da documentação...');

  DOC_SOURCES.forEach(source => {
    const pattern = `${source.sourceDir}/*.md`;
    const files = glob.sync(pattern);
    if (files.length === 0) return;

    const docGroup = { name: source.name, files: {} };
    files.forEach(file => {
      const lang = getLangFromFile(file);
      if (lang) {
        const langDisplayMap = { 'en': 'English', 'pt-br': 'Português', 'es': 'Español' };
        docGroup.files[lang] = { path: file, langDisplay: langDisplayMap[lang] || lang };
      }
    });

    Object.keys(docGroup.files).forEach(lang => {
      const fileInfo = docGroup.files[lang];
      let markdownContent = fs.readFileSync(fileInfo.path, 'utf-8');

      let contentWithAbsoluteAssets = rewriteAssetPaths(markdownContent, fileInfo.path);
      let correctedMarkdown = rewriteMarkdownLinks(contentWithAbsoluteAssets);

      const htmlContent = marked.parse(correctedMarkdown);
      const title = `${source.titlePrefix} - Omni Max`;
      const langSwitcher = createLanguageSwitcher(docGroup, lang, source.outputDir);

      const t = translations[lang] || translations['pt-br'];

      let finalHtml = TEMPLATES.main
        .replace('{{LANG}}', lang)
        .replace('{{TITLE}}', title)
        .replace('{{HEADER}}', TEMPLATES.header)
        .replace('{{FOOTER}}', TEMPLATES.footer)
        .replace('{{LANG_SWITCHER}}', langSwitcher)
        .replace('{{CONTENT}}', htmlContent);

      // [MUDANÇA] Lógica de substituição mais inteligente usando as chaves do JSON
      const placeholders = {
        '{{sidepanel.header.title}}': getNestedValue(t, 'sidepanel.header.title'),
        '{{sidepanel.header.subtitle}}': getNestedValue(t, 'sidepanel.header.subtitle'),
        '{{sidepanel.header.repo_tooltip}}': getNestedValue(t, 'sidepanel.header.repo_tooltip'),
        '{{sidepanel.footer.made_with_love}}': getNestedValue(t, 'sidepanel.footer.made_with_love'),
      };

      for (const [placeholder, value] of Object.entries(placeholders)) {
        finalHtml = finalHtml.replace(new RegExp(placeholder, 'g'), value || '');
      }

      const outputPath = path.resolve(CWD, source.outputDir, lang, 'index.html');
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, finalHtml);

      console.log(`✅ Gerado: ${path.relative(CWD, outputPath)}`);
    });
  });

  console.log('\n✨ Geração de documentos concluída!');
}

generateDocs();