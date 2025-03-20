import { useState, useEffect } from 'react'

interface ToastProps {
  show: boolean
  message: string
  duration?: number
}

export default function Toast({ show, message, duration = 2000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    if (show) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [show, duration])
  
  if (!isVisible) return null
  
  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 text-white py-2 px-4 rounded-md shadow-lg transition-opacity duration-300">
      {message}
    </div>
  )
} 