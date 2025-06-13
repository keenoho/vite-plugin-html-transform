import fs from 'fs';
import path from 'path';

export function transformHtml(subFilePath) {
  let htmlContent = fs.readFileSync(subFilePath, 'utf-8');

  let isInHead = false;
  let isInBody = false;

  const htmlContentSplits = htmlContent.split('\n');
  const injectResources = [];

  for (let i = 0; i < htmlContentSplits.length; i++) {
    const line = htmlContentSplits[i];
    if (line.includes('<head>')) {
      isInHead = true;
      continue;
    }
    if (line.includes('</head>')) {
      isInHead = false;
      continue;
    }
    if (line.includes('<body')) {
      isInBody = true;
      continue;
    }
    if (line.includes('</body>')) {
      isInBody = false;
      continue;
    }
    if (isInHead) {
      const isTargetLine =
        (/^\s+<link/.test(line) && /rel=\"stylesheet\".*crossorigin.*href=\".*\".*>/.test(line)) || // css
        (/^\s+<script/.test(line) && /type=\"module\".*crossorigin.*src=\".*\".*>/.test(line)) || // js
        (/^\s+<script/.test(line) && /type=\"module\".*>/.test(line)); // js
      if (isTargetLine) {
        injectResources.push(line);
        htmlContentSplits.splice(i, 1);
        i--;
        continue;
      }
    }
    if (isInBody) {
      if (/<script/.test(line) && injectResources.length > 0) {
        const injectCotnent = injectResources.join('\n');
        htmlContentSplits.splice(i, 0, injectCotnent);
        i += injectResources.length;
        injectResources.length = 0;
      }
    }
  }

  const newHtmlContent = htmlContentSplits.join('\n');
  fs.writeFileSync(subFilePath, newHtmlContent, 'utf-8');
}

export default function htmlTransfromPlugin(options) {
  let config;

  return {
    name: 'vite-plugin-html-transform',

    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },

    closeBundle(err) {
      if (err) {
        console.log(err);
        return;
      }

      let { root, outDir } = options || {};
      root = root || config?.inlineConfig?.root || config?.root || process.cwd();
      outDir = config?.inlineConfig?.build.outDir || config?.build.outDir || 'dist';
      const distDir = path.resolve(root, outDir);

      for (let subFile of fs.readdirSync(distDir)) {
        const subFilePath = path.resolve(distDir, subFile);
        const stat = fs.statSync(subFilePath);
        if (stat.isFile() && path.extname(subFile) === '.html') {
          transformHtml(subFilePath);
        }
      }
    },
  };
}
