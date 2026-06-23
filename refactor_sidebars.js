const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'game.html',
  'equipamentos.html',
  'formulas.html',
  'objetivos.html',
  'portoes.html',
  'ranking.html',
  'tecnicas.html',
  'vila.html'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to remove the aside block
  const asideRegex = /<aside class="sidebar">[\s\S]*?<\/aside>/i;
  content = content.replace(asideRegex, '');

  // Add script to head if not present
  if (!content.includes('sidebar.js')) {
    content = content.replace('</head>', '<script src="js/sidebar.js" defer></script>\n</head>');
  }

  fs.writeFileSync(filePath, content);
  console.log('Updated ' + file);
});
