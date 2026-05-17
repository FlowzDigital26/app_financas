'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function getLabel() {
  const raw = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function LiveDate() {
  const [label, setLabel] = useState(getLabel)

  useEffect(() => {
    // Recalcula à meia-noite para virar o dia automaticamente
    function scheduleNextDay() {
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const ms = midnight.getTime() - now.getTime()
      return setTimeout(() => {
        setLabel(getLabel())
        scheduleNextDay()
      }, ms)
    }
    const t = scheduleNextDay()
    return () => clearTimeout(t)
  }, [])

  return <>{label}</>
}
