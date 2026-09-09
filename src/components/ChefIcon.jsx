/**
 * Chapéu de chef animado (piscar + balanço) — mascote do app.
 * padrão: chapéu amarelo #f6d353 com olhos ink
 * em botões amarelos: cor="#0a0a0c" corOlhos="#f6d353"
 */
export function ChefIcon({ className = 'h-16 w-16', cor = '#f6d353', corOlhos = '#0a0a0c', animado = true }) {
  return (
    <div className={`${animado ? 'chef-anim' : ''} ${className}`}>
      <svg viewBox="0 0 200 200" width="100%" height="100%" aria-label="Chef das finanças">
        {/* Chapéu */}
        <path
          fill={cor}
          d="M 100 25 
             C 125 25 140 40 148 50 
             C 175 45 185 75 175 105 
             C 185 130 160 160 125 155 
             C 115 158 85 158 75 155 
             C 40 160 15 130 25 105 
             C 15 75 25 45 52 50 
             C 60 40 75 25 100 25 Z"
        />
        {/* Detalhe da base */}
        <rect x="70" y="166" width="60" height="12" rx="6" fill={cor} />
        {/* Olhos */}
        <rect className="olho" x="76" y="75" width="14" height="38" rx="7" fill={corOlhos} />
        <rect className="olho" x="110" y="75" width="14" height="38" rx="7" fill={corOlhos} />
      </svg>
    </div>
  )
}
