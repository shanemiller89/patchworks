import {
  createPrompt,
  isEnterKey,
  useKeypress,
  usePrefix,
  useState,
} from '@inquirer/core'
import chalk from 'chalk'

export interface ToggleConfig {
  message: string
  active?: string
  inactive?: string
  default?: boolean
}

export interface KeyEvent {
  name: string
  [key: string]: any
}

// Define a custom toggle prompt
export const customTogglePrompt = createPrompt<boolean, ToggleConfig>((config, done) => {
  const [status, setStatus] = useState<string>('idle')
  const activeLabel: string = config.active || 'Yes'
  const inactiveLabel: string = config.inactive || 'No'
  const [value, setValue] = useState<string>(
    config.default ? activeLabel : inactiveLabel,
  )
  const prefix = usePrefix({ status })

  // Handle keypress events
  useKeypress((key: KeyEvent) => {
    if (isEnterKey(key)) {
      setStatus('done')
      done(value === activeLabel)
    } else if (key.name === 'left' || key.name === 'right') {
      setValue(value === activeLabel ? inactiveLabel : activeLabel) // Toggle between active and inactive labels
    }
  })

  const message: string = chalk.bold(config.message)
  const optionsDisplay: string = `${
    value === activeLabel
      ? chalk.cyanBright(activeLabel)
      : chalk.dim(activeLabel)
  }/${
    value === inactiveLabel
      ? chalk.cyanBright(inactiveLabel)
      : chalk.dim(inactiveLabel)
  }`
  const formattedValue: string = status === 'done' ? chalk.green(value) : optionsDisplay

  return `${prefix} ${message} ${formattedValue}`
})
