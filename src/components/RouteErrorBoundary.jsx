import React from 'react';
import { useLocation } from 'react-router-dom';

class RouteErrorBoundaryContent extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    // Não registrar dados do jogador, tokens nem conteúdo sensível.
    console.error('[route] Falha ao renderizar tela', error?.message, info?.componentStack);
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="page flex-col justify-center items-center min-h-[50vh] text-center" role="alert">
        <h2 className="paper text-2xl mb-3">Não foi possível abrir esta tela</h2>
        <p className="muted mb-5">
          A página não carregou corretamente. Você pode tentar novamente sem iniciar nenhuma ação de jogo.
        </p>
        <div className="flex-row gap-3 justify-center">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
          <a className="btn-ghost" href="/dashboard">Voltar ao Painel</a>
        </div>
      </main>
    );
  }
}

export default function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <RouteErrorBoundaryContent key={pathname}>{children}</RouteErrorBoundaryContent>;
}
