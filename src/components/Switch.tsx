import { cn } from '../utils'

interface SwitchProps {
  checked: boolean
  onChange: () => void
  title?: string
}

export function Switch({ checked, onChange, title }: SwitchProps) {
  return (
    <label className={cn('switch', checked && 'on')} title={title}>
      <input
        type="checkbox"
        className="tw-sr-only"
        checked={checked}
        onChange={onChange}
      />
    </label>
  )
}
