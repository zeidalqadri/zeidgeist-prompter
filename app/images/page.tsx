'use client'

import React, { useState } from 'react'
import { ImageGenerator } from '../../components/images/image-generator'
import { ImageUploader } from '../../components/images/image-uploader'
import { ImageAnalyzer } from '../../components/images/image-analyzer'

type Tab = 'generate' | 'upload' | 'analyze'

export default function ImagesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('generate')

  const tabs = [
    { id: 'generate' as Tab, label: 'Generate', icon: '🎨' },
    { id: 'upload' as Tab, label: 'Upload', icon: '📤' },
    { id: 'analyze' as Tab, label: 'Analyze', icon: '🔍' }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Image Studio</h1>
          <p className="text-gray-600 mt-2">
            Generate, upload, and analyze images with advanced AI
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'generate' && <ImageGenerator />}
            {activeTab === 'upload' && <ImageUploader />}
            {activeTab === 'analyze' && <ImageAnalyzer />}
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>All generated images include a small watermark at the top-left corner</p>
          <p className="mt-1">Daily limits: 3 generations, 10 uploads, 20 analyses per user</p>
        </div>
      </div>
    </div>
  )
}
