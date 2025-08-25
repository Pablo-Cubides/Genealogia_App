import React from 'react'
import './globals.css'

export const metadata = {
  title: 'Genealogía Dinámica',
  description: 'Editor y visualizador de árboles genealógicos',
}

export default function RootLayout({ children }: { children: React.ReactNode }){
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
