
'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from './button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import { Calendar } from './calendar'
import { Label } from './label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from './select'
import { ChevronUpIcon, ChevronDownIcon, CheckIcon, ResetIcon } from '@radix-ui/react-icons'
import { cn } from '@/core/lib/utils'

export interface DateRangePickerProps {
  /** Click handler for applying the updates from DateRangePicker. */
  onUpdate?: (values: { range: DateRange }) => void
  /** Initial value for start date */
  initialDateFrom?: Date | string
  /** Initial value for end date */
  initialDateTo?: Date | string
  /** Alignment of popover */
  align?: 'start' | 'center' | 'end'
  /** Option for locale */
  locale?: string
}

const formatDate = (date: Date, locale: string = 'en-us'): string => {
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  })
}

const getDateAdjustedForTimezone = (dateInput: Date | string): Date => {
  if (typeof dateInput === 'string') {
    return new Date(dateInput)
  }
  return dateInput
}

interface DateRange {
  from: Date | undefined
  to: Date | undefined
}

interface Preset {
  name: string
  label: string
  type: 'time' | 'date'
}

const PRESETS: Preset[] = [
  { name: 'last5', label: 'Last 5 Minutes', type: 'time' },
  { name: 'last15', label: 'Last 15 Minutes', type: 'time' },
  { name: 'last30', label: 'Last 30 Minutes', type: 'time' },
  { name: 'last1h', label: 'Last 1 Hour', type: 'time' },
  { name: 'last6h', label: 'Last 6 Hours', type: 'time' },
  { name: 'last12h', label: 'Last 12 Hours', type: 'time' },
  { name: 'today', label: 'Today', type: 'date' },
  { name: 'yesterday', label: 'Yesterday', type: 'date' },
  { name: 'last7', label: 'Last 7 days', type: 'date' },
  { name: 'thisWeek', label: 'This Week', type: 'date' },
  { name: 'lastWeek', label: 'Last Week', type: 'date' },
  { name: 'thisMonth', label: 'This Month', type: 'date' },
  { name: 'lastMonth', label: 'Last Month', type: 'date' }
]

interface TimePickerProps {
  date: Date
  onChange: (date: Date) => void
  label: string
}

const TimePicker = ({ date, onChange, label }: TimePickerProps) => {
  const handleTimeChange = (type: 'hour' | 'minute', value: string) => {
    const newDate = new Date(date)
    if (type === 'hour') {
      newDate.setHours(parseInt(value))
    } else {
      newDate.setMinutes(parseInt(value))
    }
    onChange(newDate)
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1">
        <Select
          value={date.getHours().toString()}
          onValueChange={(val) => handleTimeChange('hour', val)}
        >
          <SelectTrigger className="w-[65px] h-8 focus:ring-0">
            <SelectValue placeholder="HH" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px]">
            {Array.from({ length: 24 }, (_, i) => (
              <SelectItem key={i} value={i.toString()}>
                {i.toString().padStart(2, '0')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground">:</span>
        <Select
          value={date.getMinutes().toString()}
          onValueChange={(val) => handleTimeChange('minute', val)}
        >
          <SelectTrigger className="w-[65px] h-8 focus:ring-0">
            <SelectValue placeholder="MM" />
          </SelectTrigger>
          <SelectContent position="popper" className="max-h-[200px]">
            {Array.from({ length: 12 }, (_, i) => (
              <SelectItem key={i * 5} value={(i * 5).toString()}>
                {(i * 5).toString().padStart(2, '0')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export const DateTimeRangePicker = ({
  initialDateFrom,
  initialDateTo,
  onUpdate,
  align = 'end',
  locale = 'en-US',
}: DateRangePickerProps): React.JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)

  const [range, setRange] = useState<DateRange>({
    from: initialDateFrom ? getDateAdjustedForTimezone(initialDateFrom) : undefined,
    to: initialDateTo ? getDateAdjustedForTimezone(initialDateTo) : undefined
  })

  const lastPresetClicked = useRef<string | undefined>(undefined);

  const [selectedPreset, setSelectedPreset] = useState<string | undefined>(undefined)
  const [isSmallScreen, setIsSmallScreen] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 960 : false
  )

  useEffect(() => {
    const handleResize = (): void => {
      setIsSmallScreen(window.innerWidth < 960)
    }
    window.addEventListener('resize', handleResize)
    return () => { window.removeEventListener('resize', handleResize) }
  }, [])

  const getPresetRange = (presetName: string): DateRange => {
    const preset = PRESETS.find(({ name }) => name === presetName)
    if (!preset) throw new Error(`Unknown date range preset: ${presetName}`)
    const from = new Date()
    const to = new Date()
    const first = from.getDate() - from.getDay()

    switch (preset.name) {
      case 'last5':
        from.setMinutes(from.getMinutes() - 5)
        break
      case 'last15':
        from.setMinutes(from.getMinutes() - 15)
        break
      case 'last30':
        from.setMinutes(from.getMinutes() - 30)
        break
      case 'last1h':
        from.setHours(from.getHours() - 1)
        break
      case 'last6h':
        from.setHours(from.getHours() - 6)
        break
      case 'last12h':
        from.setHours(from.getHours() - 12)
        break
      case 'today':
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'yesterday':
        from.setDate(from.getDate() - 1)
        from.setHours(0, 0, 0, 0)
        to.setDate(to.getDate() - 1)
        to.setHours(23, 59, 59, 999)
        break
      case 'last7':
        from.setDate(from.getDate() - 6)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'last14':
        from.setDate(from.getDate() - 13)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'thisWeek':
        from.setDate(first)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'lastWeek':
        from.setDate(from.getDate() - 7 - from.getDay())
        to.setDate(to.getDate() - to.getDay() - 1)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'thisMonth':
        from.setDate(1)
        from.setHours(0, 0, 0, 0)
        to.setHours(23, 59, 59, 999)
        break
      case 'lastMonth':
        from.setMonth(from.getMonth() - 1)
        from.setDate(1)
        from.setHours(0, 0, 0, 0)
        to.setDate(0)
        to.setHours(23, 59, 59, 999)
        break
    }

    return { from, to }
  }

  const setPreset = (preset: string): void => {
    const range = getPresetRange(preset)
    setRange(range)
    lastPresetClicked.current = preset
  }

  const checkPreset = (): void => {
    if (lastPresetClicked.current) {
      setSelectedPreset(lastPresetClicked.current)
      lastPresetClicked.current = undefined
      return
    }

    if (!range.from) {
      setSelectedPreset(undefined)
      return
    }

    for (const preset of PRESETS) {
      if (preset.type === 'time') continue

      const presetRange = getPresetRange(preset.name)
      if (!presetRange.from) continue

      const normalizedRangeFrom = new Date(range.from);
      normalizedRangeFrom.setHours(0, 0, 0, 0);
      const normalizedPresetFrom = new Date(
        presetRange.from.setHours(0, 0, 0, 0)
      )

      const normalizedRangeTo = new Date(range.to ?? 0);
      normalizedRangeTo.setHours(0, 0, 0, 0);
      const normalizedPresetTo = new Date(
        presetRange.to?.setHours(0, 0, 0, 0) ?? 0
      )

      if (
        normalizedRangeFrom.getTime() === normalizedPresetFrom.getTime() &&
        normalizedRangeTo.getTime() === normalizedPresetTo.getTime()
      ) {
        setSelectedPreset(preset.name)
        return
      }
    }

    setSelectedPreset(undefined)
  }

  const resetValues = (): void => {
    setRange({ from: undefined, to: undefined })
    setSelectedPreset(undefined)
  }

  useEffect(() => {
    checkPreset()
  }, [range])

  const PresetButton = ({
    preset,
    label,
    isSelected
  }: {
    preset: string
    label: string
    isSelected: boolean
  }): React.JSX.Element => (
    <Button
      className={cn(isSelected && 'pointer-events-none')}
      variant="ghost"
      size={"sm"}
      onClick={() => {
        setPreset(preset)
      }}
    >
      <>
        <span className={cn('pr-2 opacity-0', isSelected && 'opacity-70')}>
          <CheckIcon width={18} height={18} />
        </span>
        {label}
      </>
    </Button>
  )

  const handleDateSelect = (value: { from?: Date, to?: Date } | undefined) => {
    if (value?.from != null) {
      const newFrom = new Date(value.from)

      // If we have an existing start time, keep it, otherwise default to 00:00
      if (range.from) {
        newFrom.setHours(range.from.getHours(), range.from.getMinutes(), 0, 0)
      } else {
        newFrom.setHours(0, 0, 0, 0)
      }

      const newTo: Date | undefined = value.to ? new Date(value.to) : undefined

      // If we have an existing end time, keep it
      if (newTo && range.to) {
        newTo.setHours(range.to.getHours(), range.to.getMinutes(), 0, 0)
      } else if (newTo) {
        // Default new end date to end of day
        newTo.setHours(23, 59, 59, 999)
      }

      setRange({ from: newFrom, to: newTo })
    } else {
      // User likely cleared via calendar interaction (if allowed)
      setRange({ from: undefined, to: undefined })
    }
  }

  return (
    <Popover
      modal={true}
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) {
          onUpdate?.({ range })
        }
        setIsOpen(open)
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="outline" className="px-3">
          <div className="text-right">
            <div className="">
              {range.from ? (
                selectedPreset ? (
                  <div>{PRESETS.find(p => p.name == selectedPreset)?.label}</div>
                ) : (
                  <div>
                    {`${formatDate(range.from, locale)}${range.to != null ? ' - ' + formatDate(range.to, locale) : ''}`}
                  </div>
                )
              ) : (
                // Empty State
                <div className="font-semibold">Always</div>
              )}
            </div>
          </div>
          <div className="opacity-60 -mr-2 scale-125">
            {isOpen ? (<ChevronUpIcon width={24} />) : (<ChevronDownIcon width={24} />)}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-auto rounded-2xl p-0">
        <div className="flex p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <Calendar
                mode="range"
                onSelect={handleDateSelect}
                selected={range as any} // Cast to any to handle undefined 'from' gracefully
                numberOfMonths={isSmallScreen ? 1 : 2}
                defaultMonth={
                  new Date(
                    new Date().setMonth(
                      new Date().getMonth() - (isSmallScreen ? 0 : 1)
                    )
                  )
                }
              />
            </div>

            {/* Only show Time Picker if we have a range selected */}
            {range.from && (
              <div className="flex items-center justify-between border-t pt-4">
                <TimePicker
                  label="Start Time"
                  date={range.from}
                  onChange={(date) => {
                    setRange((prev) => ({ ...prev, from: date }))
                  }}
                />
                {range.to && (
                  <TimePicker
                    label="End Time"
                    date={range.to}
                    onChange={(date) => {
                      setRange((prev) => ({ ...prev, to: date }))
                    }}
                  />
                )}
              </div>
            )}

            {!range.from && (
              <div className="flex items-center justify-center h-[73px] border-t pt-4 text-muted-foreground text-sm">
                Select a date to set time
              </div>
            )}
          </div>

          {!isSmallScreen && (
            <div className="flex flex-col items-end gap-1 border-l pl-4 overflow-y-auto max-h-[350px]">
              <div className="flex w-full justify-end mb-2 pb-2 border-b">
                <Button
                  variant="ghost"
                  onClick={resetValues}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <ResetIcon className="mr-2 h-4 w-4" />
                  Reset
                </Button>
              </div>

              <div className="flex w-full flex-col items-end gap-1 mb-2">
                <Label className="text-xs text-muted-foreground mb-1 text-right w-full">Time</Label>
                {PRESETS.filter(p => p.type === 'time').map((preset) => (
                  <PresetButton
                    key={preset.name}
                    preset={preset.name}
                    label={preset.label}
                    isSelected={selectedPreset === preset.name}
                  />
                ))}
              </div>
              <div className="flex w-full flex-col items-end gap-1 border-t pt-2">
                <Label className="text-xs text-muted-foreground mb-1 text-right w-full">Date</Label>
                {PRESETS.filter(p => p.type === 'date').map((preset) => (
                  <PresetButton
                    key={preset.name}
                    preset={preset.name}
                    label={preset.label}
                    isSelected={selectedPreset === preset.name}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

DateTimeRangePicker.displayName = 'DateTimeRangePicker'
