import { cn } from '../../lib/cn'
import { STAGE_CONFIG, CHANNEL_CONFIG } from '../../constants/bd'
import type { LeadStage, BdChannel, LeadTemperature, IcpFit } from '../../types'

/**
 * Domain chips for the BD module. The lookup tables they read from live in
 * src/constants/bd.ts — this file exports components only, so Fast Refresh works.
 */

const TEMPERATURE_CONFIG: Record<LeadTemperature, { label: string; classes: string }> = {
  hot:  { label: 'Hot',  classes: 'bg-[rgba(244,54,76,0.12)] text-[#F4364C] border-[rgba(244,54,76,0.3)]' },
  warm: { label: 'Warm', classes: 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]' },
  cold: { label: 'Cold', classes: 'bg-[rgba(96,165,250,0.12)] text-[#60A5FA] border-[rgba(96,165,250,0.3)]' },
}

const ICP_CONFIG: Record<IcpFit, { label: string; classes: string }> = {
  strong:  { label: 'Strong fit',  classes: 'bg-[rgba(34,197,94,0.12)] text-[#22C55E] border-[rgba(34,197,94,0.3)]' },
  partial: { label: 'Partial fit', classes: 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B] border-[rgba(245,158,11,0.3)]' },
  none:    { label: 'Not a fit',   classes: 'bg-surface-3 text-text-3 border-border-default' },
}

const chipBase =
  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] leading-[1.4] whitespace-nowrap'

interface StageChipProps {
  stage: LeadStage
  className?: string
}

export function StageChip({ stage, className }: StageChipProps) {
  const config = STAGE_CONFIG[stage]
  if (!config) return null
  return <span className={cn(chipBase, config.chip, className)}>{config.label}</span>
}

interface ChannelChipProps {
  channel: BdChannel
  /** Icon only — for dense rows where the label would not fit. */
  compact?: boolean
  className?: string
}

export function ChannelChip({ channel, compact, className }: ChannelChipProps) {
  const config = CHANNEL_CONFIG[channel]
  if (!config) return null
  const Icon = config.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-ui text-[11px] font-medium text-text-2 whitespace-nowrap',
        className,
      )}
      title={compact ? config.label : undefined}
    >
      <Icon size={12} className={cn('shrink-0', config.tint)} />
      {!compact && config.label}
    </span>
  )
}

interface TemperatureChipProps {
  temperature: LeadTemperature
  className?: string
}

export function TemperatureChip({ temperature, className }: TemperatureChipProps) {
  const config = TEMPERATURE_CONFIG[temperature]
  if (!config) return null
  return <span className={cn(chipBase, config.classes, className)}>{config.label}</span>
}

interface IcpFitChipProps {
  fit: IcpFit
  className?: string
}

export function IcpFitChip({ fit, className }: IcpFitChipProps) {
  const config = ICP_CONFIG[fit]
  if (!config) return null
  return <span className={cn(chipBase, config.classes, className)}>{config.label}</span>
}
