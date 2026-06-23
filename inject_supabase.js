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
  'vila.html',
  'forjar.html',
  'selecionar.html'
];

filesToUpdate.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf8');

  // Add supabase scripts to head if not present
  if (!content.includes('supabase-js')) {
    content = content.replace('</head>', '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>\n<script src="js/supabase-client.js"></script>\n</head>');
  }

  fs.writeFileSync(filePath, content);
  console.log('Injetado Supabase em: ' + file);
});
