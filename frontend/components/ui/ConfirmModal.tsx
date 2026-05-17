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
            style={{ zIndex: 1 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Content with proper shadow and depth */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            style={{
              position: 'relative',
              zIndex: 10,
              width: '90%',
              maxWidth: '360px',
              backgroundColor: '#18181b',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '24px',
              boxShadow: '0 24px 50px -12px rgba(0,0,0,0.6)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '32px 24px 28px 24px' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={onConfirm}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    color: '#ffffff',
                    border: 'none',
                    backgroundColor: type === 'danger' ? '#dc2626' : '#4f46e5',
                    boxShadow: type === 'danger' ? '0 8px 16px rgba(220, 38, 38, 0.25)' : '0 8px 16px rgba(79, 70, 229, 0.25)',
                    transition: 'all 0.2s'
                  }}
                  className="active:scale-[0.97] hover:brightness-110"
                >
                  {confirmText}
                </button>
                <button
                  onClick={onCancel}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    borderRadius: '14px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    color: '#a1a1aa',
                    backgroundColor: 'rgba(39, 39, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    transition: 'all 0.2s'
                  }}
                  className="active:scale-[0.97] hover:bg-zinc-800/80 hover:text-zinc-200"
                >
                  {cancelText}
                </button>
              </div>
            </div>

            {/* Close button in corner */}
            <button 
              onClick={onCancel}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                cursor: 'pointer',
                color: '#71717a',
                transition: 'all 0.2s'
              }}
              className="hover:bg-white/10 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
