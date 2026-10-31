import React from 'react';

/** Painel neutro com layout semântico escolhido pela página (section, aside, article). */
export default function GamePanel({ as: Element = 'section', children, className = '', ...rest }) {
  return <Element className={['kui-panel', className].filter(Boolean).join(' ')} {...rest}>{children}</Element>;
}
