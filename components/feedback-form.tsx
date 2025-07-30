"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ThumbsUp, ThumbsDown, X, Send, Check } from "lucide-react"

interface FeedbackFormProps {
  originalPrompt: string
  enhancedPrompt: string
  onClose: () => void
}

export default function FeedbackForm({ originalPrompt, enhancedPrompt, onClose }: FeedbackFormProps) {
  const [feedback, setFeedback] = useState("")
  const [rating, setRating] = useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (rating === null) {
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/engineer/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          original: originalPrompt,
          refined: enhancedPrompt,
          wasSuccessful: rating,
          feedback: feedback.trim() || undefined
        }),
      })

      if (response.ok) {
        setIsSubmitted(true)
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        console.error('Failed to submit feedback')
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <div className="flex items-center gap-2 text-green-700">
          <Check size={16} />
          <span className="text-sm font-medium">Thank you for your feedback!</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">How was this refinement?</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X size={14} />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={rating === true ? "default" : "outline"}
            size="sm"
            onClick={() => setRating(true)}
            className="flex-1"
          >
            <ThumbsUp size={14} className="mr-1" />
            Helpful
          </Button>
          <Button
            type="button"
            variant={rating === false ? "destructive" : "outline"}
            size="sm"
            onClick={() => setRating(false)}
            className="flex-1"
          >
            <ThumbsDown size={14} className="mr-1" />
            Not Helpful
          </Button>
        </div>

        <Textarea
          placeholder="Any additional feedback? (optional)"
          className="resize-none h-16 text-xs"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={rating === null || isSubmitting}
            className="bg-black text-white hover:bg-gray-800"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
            ) : (
              <Send size={12} className="mr-1" />
            )}
            Submit
          </Button>
        </div>
      </form>
    </div>
  )
}