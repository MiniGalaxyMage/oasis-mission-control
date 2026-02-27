import './Footer.css'

interface FooterProps {
  timestamp: string | null
}

export function Footer({ timestamp }: FooterProps) {
  const formatted = timestamp
    ? new Date(timestamp).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—'

  return (
    <footer className="app-footer">
      <span>🕐 Última actualización: <strong>{formatted}</strong></span>
      <span className="footer-brand">OASIS MISSION CONTROL v2.0</span>
    </footer>
  )
}
