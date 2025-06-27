// scripts/generate-docs.mjs (v2 com debug e correções)
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
import { glob } from 'glob';

const CWD = process.cwd();
console.log(`[DEBUG] Caminho atual: ${CWD}`);
// --- Configuração ---
const DOC_SOURCES = [
  {
    name: 'privacy-policy',
    sourceDir: 'docs/privacy_policy',
    outputDir: 'public/privacy_policy',
    titlePrefix: 'Política de Privacidade'
  },
  {
    name: 'user-guide',
    sourceDir: 'docs/user_guide',
    outputDir: 'public/user_guide',
    titlePrefix: 'Guia do Usuário'
  }
];

const TEMPLATES = {
  main: fs.readFileSync(path.resolve(CWD, 'scripts/templates/main.html'), 'utf-8'),
  header: fs.readFileSync(path.resolve(CWD, 'scripts/templates/header.html'), 'utf-8'),
  footer: fs.readFileSync(path.resolve(CWD, 'scripts/templates/footer.html'), 'utf-8'),
};

// [CORREÇÃO] Função mais robusta para extrair o idioma
function getLangFromFile(filePath) {
  const fileName = path.basename(filePath, '.md'); // Ex: "README.pt-BR" ou "README"
  const parts = fileName.split('.');
  
  if (parts.length > 1) {
    const lang = parts.pop().toLowerCase();
    // Trata casos como 'pt-br' ou 'pt-BR'
    return lang.toLowerCase() === 'pt-br' ? 'pt-br' : lang;
  }
  // Se não houver ponto (ex: "README"), consideramos inglês
  return 'en';
}

// [CORREÇÃO] Regex mais flexível para reescrever links
function rewriteMarkdownLinks(markdownContent) {
    // Regex para encontrar links como [Texto](./ARQUIVO.es.md) ou [Texto](./ARQUIVO.md)
    return markdownContent.replace(/\[(.*?)\]\(\.\/([\w.-]+)\.md\)/g, (match, text, fileName) => {
        const langCode = getLangFromFile(fileName + '.md'); // Re-usa nossa função para extrair o idioma do link
        return `[${text}](../${langCode}/)`; // Transforma em <a href="../es/"> ou <a href="../en/">
    });
}


function createLanguageSwitcher(docGroup, currentLang, baseOutputDir) {
  const links = Object.keys(docGroup.files).map(lang => {
    const relativePath = path.relative(path.join(baseOutputDir, currentLang), path.join(baseOutputDir, lang));
    if (lang === currentLang) {
      return `<span>${docGroup.files[lang].langDisplay}</span>`;
    }
    // Garante que o link para a raiz (inglês) aponte corretamente
    const finalPath = relativePath.replace(/\\/g, '/'); // Normaliza para barras de URL
    return `<a href="${finalPath || '.'}/">${docGroup.files[lang].langDisplay}</a>`;
  });
  return links.join(' · ');
}

function generateDocs() {
  console.log('🚀 Iniciando a geração da documentação...');

  DOC_SOURCES.forEach(source => {
    console.log(`\n[DEBUG] Processando source: "${source.name}"`);
    const pattern = `${source.sourceDir}/*.md`;
    console.log(`[DEBUG] Padrão Glob para busca: "${pattern}"`);
    
    const files = glob.sync(pattern);
    console.log(`[DEBUG] Arquivos encontrados:`, files);

    if (files.length === 0) {
        console.warn(`[WARN] Nenhum arquivo .md encontrado para "${source.name}". Pulando.`);
        return;
    }
    
    const docGroup = {
        name: source.name,
        files: {}
    };

    files.forEach(file => {
        const lang = getLangFromFile(file);
        console.log(`[DEBUG] Processando arquivo: "${file}", Idioma extraído: "${lang}"`);
        if(lang) {
            const langDisplayMap = { 'en': 'English', 'pt-br': 'Português', 'es': 'Español' };
            docGroup.files[lang] = { path: file, langDisplay: langDisplayMap[lang] || lang };
        } else {
            console.warn(`[WARN] Não foi possível extrair o idioma do arquivo: "${file}"`);
        }
    });

    console.log(`[DEBUG] Grupo de documentos montado para "${source.name}":`, docGroup);

    Object.keys(docGroup.files).forEach(lang => {
      const fileInfo = docGroup.files[lang];
      const markdownContent = fs.readFileSync(fileInfo.path, 'utf-8');
      
      const correctedMarkdown = rewriteMarkdownLinks(markdownContent);
      const htmlContent = marked.parse(correctedMarkdown);
      
      const title = `${source.titlePrefix} - Omni Max`;
      const langSwitcher = createLanguageSwitcher(docGroup, lang, source.outputDir);

      let finalHtml = TEMPLATES.main
        .replace('{{LANG}}', lang)
        .replace('{{TITLE}}', title)
        .replace('{{HEADER}}', TEMPLATES.header)
        .replace('{{FOOTER}}', TEMPLATES.footer)
        .replace('{{LANG_SWITCHER}}', langSwitcher)
        .replace('{{CONTENT}}', htmlContent);

      const outputPath = path.resolve(CWD, source.outputDir, lang, 'index.html');
      const outputDir = path.dirname(outputPath);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(outputPath, finalHtml);

      console.log(`✅ Gerado: ${path.relative(CWD, outputPath)}`);
    });
  });

  console.log('\n✨ Geração de documentos concluída!');
}

generateDocs();