import { useAppState } from '../hooks/useAppState'
import { cn } from '../utils'

export function Alert() {
  const { alert, dismissAlert } = useAppState()
  if (!alert) return null

  return (
    <div
      className={cn(
        'tw-fixed tw-bottom-8 tw-left-1/2 tw--translate-x-1/2 tw-z-50 tw-p-8 tw-rounded-md tw-max-w-xl tw-w-[90%] tw-text-center tw-text-sm',
        alert.type === 'success' ? 'tw-bg-[#7BE38A] tw-text-black' : 'tw-bg-[#FF5247] tw-text-white',
      )}
    >
      {alert.message}
      <button onClick={dismissAlert} className="tw-ml-4 tw-opacity-70 hover:tw-opacity-100 tw-font-bold">
        ×
      </button>
    </div>
  )
}
