document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname.split('/').pop() || 'game.html';

  function isActive(page) {
    return currentPath === page ? 'active' : '';
  }

  const sidebarHTML = `
  <aside class="sidebar">
    <div class="brand"><div class="mark"></div>KUROKAGE</div>
    
    <div class="navgroup">
      <div class="label">Personagem</div>
      <a href="game.html" class="navitem ${isActive('game.html')}"><div class="dot"></div>Ficha</a>
      <a href="tecnicas.html" class="navitem ${isActive('tecnicas.html')}"><div class="dot"></div>Técnicas</a>
      <a href="equipamentos.html" class="navitem ${isActive('equipamentos.html')}"><div class="dot"></div>Inventário</a>
      <a href="portoes.html" class="navitem ${isActive('portoes.html')}"><div class="dot"></div>8 Portões de Chakra</a>
    </div>

    <div class="navgroup">
      <div class="label">Academia</div>
      <a href="tarefas.html" class="navitem ${isActive('tarefas.html')}"><div class="dot"></div>Tarefas Iniciais</a>
      <a href="graduacoes.html" class="navitem ${isActive('graduacoes.html')}"><div class="dot"></div>Graduações</a>
    </div>

    <div class="navgroup">
      <div class="label">Mundo</div>
      <a href="objetivos.html" class="navitem ${isActive('objetivos.html')}"><div class="dot"></div>Missões</a>
      <a href="ranking.html" class="navitem ${isActive('ranking.html')}"><div class="dot"></div>Ranking</a>
      <a href="vila.html" class="navitem ${isActive('vila.html')}"><div class="dot"></div>Vila Atual</a>
      <a href="#" class="navitem"><div class="dot"></div>Clãs</a>
    </div>

    <div class="navgroup">
      <div class="label">Sistema</div>
      <a href="formulas.html" class="navitem ${isActive('formulas.html')}"><div class="dot"></div>Fórmulas do Jogo</a>
      <a href="#" class="navitem"><div class="dot"></div>Crônicas</a>
      <a href="#" class="navitem"><div class="dot"></div>Configurações</a>
    </div>

    <div class="sidebar-footer">
      <div>TEMPORADA IV</div>
      <div>Servidor S1 · Ping: 42ms</div>
    </div>
  </aside>
  `;

  // Insert the sidebar into the .app container
  const appContainer = document.querySelector('.app');
  if (appContainer) {
    appContainer.insertAdjacentHTML('afterbegin', sidebarHTML);
  }
});
