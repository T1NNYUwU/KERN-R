'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'info'
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          {/* Enhanced Overlay with stronger blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Content with proper shadow and depth */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-[360px] bg-[#1a1a1c] border border-white/10 rounded-[24px] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.7)] overflow-hidden"
          >
            <div className="p-8">
              {/* Icon & Title Area */}
              <div className="flex flex-col items-center text-center mb-8">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
                  type === 'danger' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                }`}>
                  <AlertCircle className="w-8 h-8" strokeWidth={2.5} />
                </div>
                <h3 className="text-[20px] font-bold text-white tracking-tight mb-2">{title}</h3>
                <p className="text-zinc-400 text-[13px] leading-relaxed px-2">
                  {message}
                </p>
              </div>

              {/* Actions Area with proper spacing */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={onConfirm}
                  className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.96] ${
                    type === 'danger' 
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20' 
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                  }`}
                >
                  {confirmText}
                </button>
                <button
                  onClick={onCancel}
                  className="w-full py-3.5 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 font-bold text-sm transition-all active:scale-[0.96] border border-white/5"
                >
                  {cancelText}
                </button>
              </div>
            </div>

            {/* Close button in corner */}
            <button 
              onClick={onCancel}
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
