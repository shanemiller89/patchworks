import {
  createPrompt,
  isDownKey,
  isEnterKey,
  isSpaceKey,
  isUpKey,
  useKeypress,
  usePrefix,
  useState,
} from '@inquirer/core'
import chalk from 'chalk'
// eslint-disable-next-line lodash/import-scope
import _ from 'lodash'
import { SKIPPED, UNKNOWN } from '../utils/constants.js'
import { TableGenerator } from '../utils/TableGenerator.js'
import { styles } from './styles.js'

/**
 * Displays pre-update reports in a tabular format.
 * Generates a table with package information and update details.
 * @param {Array} preUpdateReports - An array of package update reports.
 * @returns {Promise<string>} A promise that resolves to the generated table output.
 */
export function displayPreUpdateReports(preUpdateReports) {
  return new Promise((resolve) => {
    const headers = [
      'Package',
      'Current',
      'Latest',
      'Update Type',
      'Breaking Changes',
      'New Features',
    ]

    const data = preUpdateReports.map((pkg) => [
      { value: pkg.packageName },
      { value: pkg.metadata.current },
      { value: pkg.metadata.latest },
      { value: pkg.metadata.updateType, type: 'semantic' },
      {
        value: _.isEmpty(pkg.metadata.breakingChanges),
        type: 'boolean',
      },
      {
        value: _.isEmpty(pkg.metadata.newFeatures),
        type: 'boolean',
      },
    ])

    const tableGenerator = new TableGenerator(headers, data, {
      fullWidth: true,
      title: 'Pre-Update Reports',
      columnConfig: (baseWidth, terminalWidth) => ({
        0: { width: 20 },
        4: { width: Math.min(baseWidth * 2, terminalWidth / 3) },
        5: { width: Math.min(baseWidth * 2, terminalWidth / 3) },
      }),
    })

    const output = tableGenerator.generateTable()
    resolve(output)
  })
}

export function displayIncludedPackages(includedPackages) {
  return new Promise((resolve) => {
    const headers = [
      'Package',
      'Current',
      'Wanted',
      'Latest',
      'Update Type',
      'Update Difficulty',
      'GitHub URL',
      'RN Compatible',
      'FB A Compatible',
      'FB B Compatible',
      'Homepage',
    ]

    const data = includedPackages.map((pkg) => [
      { value: pkg.packageName },
      { value: pkg.metadata.current },
      { value: pkg.metadata.wanted },
      { value: pkg.metadata.latest },
      { value: pkg.metadata.updateType, type: 'semantic' },
      { value: pkg.metadata.updatingDifficulty },
      { value: pkg.metadata.githubUrl },
      {
        value: !![false, 'UNKNOWN', 'SKIPPED'].includes(
          pkg.metadata.releaseNotesCompatible,
        ),
        type: 'boolean',
      },
      {
        value: !![false, 'UNKNOWN', 'SKIPPED'].includes(
          pkg.metadata.fallbackACompatible,
        ),
        type: 'boolean',
      },
      {
        value: !![false, 'UNKNOWN', 'SKIPPED'].includes(
          pkg.metadata.fallbackBCompatible,
        ),
        type: 'boolean',
      },
      { value: pkg.metadata.homepage },
    ])

    const tableGenerator = new TableGenerator(headers, data, {
      fullWidth: true,
      title: 'Included Packages',
      columnConfig: (baseWidth, terminalWidth) => ({
        0: { width: 20 },
        6: { width: Math.min(baseWidth * 2, terminalWidth / 3) },
        10: { width: Math.min(baseWidth * 2, terminalWidth / 3) },
      }),
    })

    const output = tableGenerator.generateTable()
    resolve(output)
  })
}

export function displayExcludedPackages(excludedPackages) {
  return new Promise((resolve) => {
    const headers = [
      'Package',
      'Reason',
      'Current',
      'Wanted',
      'Latest',
      'Update Type',
      'Update Difficulty',
      'Validation Status',
    ]

    const data = excludedPackages.map((pkg) => [
      { value: pkg.packageName || pkg.metadata.name },
      { value: pkg.reason },
      { value: pkg.metadata.current },
      { value: pkg.metadata.wanted },
      { value: pkg.metadata.latest },
      { value: pkg.metadata.updateType, type: 'semantic' },
      { value: pkg.metadata.updatingDifficulty },
      { value: pkg.metadata.validationStatus },
    ])

    const tableGenerator = new TableGenerator(headers, data, {
      fullWidth: true,
      title: 'Excluded Packages',
      columnConfig: () => ({
        0: { width: 20 },
        1: { width: 20 },
        2: { width: 10 },
        3: { width: 10 },
        4: { width: 10 },
        5: { width: 15 },
        6: { width: 20 },
        7: { width: 20 },
      }),
    })

    const output = tableGenerator.generateTable()
    resolve(output)
  })
}

export function displayResultsTable(packages) {
  return new Promise((resolve) => {
    const headers = [
      'Package',
      'Current -> Latest',
      'GitHub URL',
      'Fallback URL',
      'Release Notes Compatible',
      'Fallback A Compatible',
      'Fallback B Compatible',
      'Changelog',
      'Release Notes',
      'Source',
      'T RN',
      'T FA',
      'T FB',
    ]

    const data = packages.map((pkg) => [
      { value: pkg.packageName },
      { value: `${pkg.metadata.current} -> ${pkg.metadata.latest}` },
      { value: pkg.metadata.githubUrl },
      { value: pkg.metadata.fallbackUrl },
      {
        value: [false, UNKNOWN, SKIPPED].includes(
          pkg.metadata.releaseNotesCompatible,
        ),
        type: 'boolean',
      },
      {
        value: [false, UNKNOWN, SKIPPED].includes(
          pkg.metadata.fallbackACompatible,
        ),
        type: 'boolean',
      },
      {
        value: [false, UNKNOWN, SKIPPED].includes(
          pkg.metadata.fallbackBCompatible,
        ),
        type: 'boolean',
      },
      { value: pkg.changelog },
      { value: pkg.releaseNotes[0]?.notes || null },
      { value: pkg.source },
      { value: pkg.attemptedReleaseNotes, type: 'boolean' },
      { value: pkg.attemptedFallbackA, type: 'boolean' },
      { value: pkg.attemptedFallbackB, type: 'boolean' },
    ])

    const tableGenerator = new TableGenerator(headers, data, {
      fullWidth: true,
      title: 'Results Table',
      columnConfig: () => ({
        0: { width: 20 },
        2: { width: 20 },
        3: { width: 20 },
        7: { width: 15, truncate: 50 },
        8: { width: 15, truncate: 50 },
      }),
    })

    const output = tableGenerator.generateTable()
    resolve(output)
  })
}

export function displayFinalReports(selectedPackages) {
  return new Promise((resolve) => {
    const headers = ['Package', 'Current', 'Latest', 'Update Type']

    const data = selectedPackages.map((pkg) => [
      { value: pkg.packageName },
      { value: pkg.metadata.current },
      { value: pkg.metadata.latest },
      { value: pkg.metadata.updateType, type: 'semantic' },
    ])

    const tableGenerator = new TableGenerator(headers, data, {
      fullWidth: true,
      title: 'Final Reports',
      columnConfig: () => ({
        0: { width: 40 },
        1: { width: 10 },
        2: { width: 10 },
        3: { width: 15 },
      }),
    })

    const output = tableGenerator.generateTable()
    resolve(output)
  })
}

export const customTablePrompt = createPrompt((config, done) => {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedPackages, setSelectedPackages] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const prefix = usePrefix({ status })

  const { task } = config

  const headers = [
    'Package',
    'Current',
    'Latest',
    'Update Type',
    'Breaking Changes',
    'New Features',
  ]

  const data = config.packages.map((pkg, index) => [
    {
      value:
        index === selectedIndex
          ? chalk.cyanBright(
              `${
                selectedPackages.includes(index)
                  ? `${styles.success('☑')}`
                  : '☐'
              } ${pkg.packageName}`,
            )
          : `  ${
              selectedPackages.includes(index) ? `${styles.success('☑')}` : '☐'
            } ${pkg.packageName}`,
    },
    { value: pkg.metadata.current },
    { value: pkg.metadata.latest },
    { value: pkg.metadata.updateType, type: 'semantic' },
    {
      value: pkg.metadata.breakingChanges,
    },
    {
      value: _.isEmpty(pkg.metadata.newFeatures),
      type: 'boolean',
    },
  ])

  const tableGenerator = new TableGenerator(headers, data, {
    fullWidth: true,
    title: 'Select Packages',
    columnConfig: () => ({
      0: { width: 40 },
      1: { width: 10 },
      2: { width: 10 },
      3: { width: 15 },
      4: { width: 15 },
      5: { width: 15 },
    }),
  })

  const output = tableGenerator.generateTable()

  useKeypress((key) => {
    if (isEnterKey(key)) {
      if (selectedPackages.length > 0) {
        setStatus('done')
        const selectedItems = selectedPackages.map(
          (index) => config.packages[index],
        )
        done(selectedItems)
      } else {
        setError('No packages selected. Please select at least one package.')
      }
    } else if (isUpKey(key)) {
      setSelectedIndex(
        (selectedIndex - 1 + config.packages.length) % config.packages.length,
      )
    } else if (isDownKey(key)) {
      setSelectedIndex((selectedIndex + 1) % config.packages.length)
    } else if (isSpaceKey(key)) {
      if (selectedPackages.includes(selectedIndex)) {
        setSelectedPackages(selectedPackages.filter((i) => i !== selectedIndex))
      } else {
        setSelectedPackages([...selectedPackages, selectedIndex])
      }
      setError(null)
    } else if (key.name === 'a') {
      setSelectedPackages(config.packages.map((_, index) => index))
    } else if (key.name === 'i') {
      setSelectedPackages(
        config.packages
          .map((_, index) => index)
          .filter((index) => !selectedPackages.includes(index)),
      )
    } else if (key.name === 'c') {
      setStatus('done')
      done([])
      config.task.skip('User cancelled')
      config.task.title = 'User cancelled'
      task.skip('User cancelled')
      task.title = 'User cancelled'
    }
  })

  return `${prefix} Select packages to update (Press ${chalk.bold.cyanBright(
    '<space>',
  )} to select, ${chalk.bold.cyanBright(
    '<a>',
  )} to toggle all, ${chalk.bold.cyanBright(
    '<i>',
  )} to invert selection, and ${chalk.bold.cyanBright(
    '<enter>',
  )} to proceed and ${chalk.bold.cyanBright(
    '<c>',
  )} to cancel and exit.):\n${output}\n${error ? chalk.red(error) : ''}`
})
