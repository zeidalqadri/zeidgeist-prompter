'use client'

import React from 'react'

interface StyleOption {
  value: string
  label: string
  description: string
}

const STYLES: StyleOption[] = [
  { value: 'photorealistic', label: 'Photorealistic', description: 'Lifelike and detailed' },
  { value: 'artistic', label: 'Artistic', description: 'Painterly and expressive' },
  { value: 'sketch', label: 'Sketch', description: 'Hand-drawn look' },
  { value: 'abstract', label: 'Abstract', description: 'Non-representational' },
  { value: 'cartoon', label: 'Cartoon', description: 'Illustrated and playful' },
  { value: '3d', label: '3D Render', description: 'Computer-generated 3D' }
]

interface StyleSelectorProps {
  value: string
  onChange: (style: string) => void
  className?: string
}

export function StyleSelector({ value, onChange, className = '' }: StyleSelectorProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${className}`}>
      {STYLES.map((style) => (
        <button
          key={style.value}
          onClick={() => onChange(style.value)}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            value === style.value
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="font-medium text-sm">{style.label}</div>
          <div className="text-xs text-gray-500 mt-1">{style.description}</div>
        </button>
      ))}
    </div>
  )
}
