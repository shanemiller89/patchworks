const mockBoxen = jest.fn()

jest.mock('../../reports/styles.js', () => ({
  __esModule: true,
  styles: {
    success: (msg) => msg,
    warning: (msg) => msg,
    error: (msg) => msg,
    debug: (msg) => msg,
    info: (msg) => msg,
    message: (msg) => msg,
    separator: '',
  },
  mainTitleOptions: {},
  packageReportOptions: () => ({}),
}))

jest.mock('boxen', () => ({
  __esModule: true,
  default: mockBoxen,
}))

describe('logger output behaviour', () => {
  let logger
  const originalDebug = process.env.DEBUG

  beforeAll(async () => {
    ({ default: logger } = await import('../../reports/logger.js'))
  })

  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.DEBUG
  })

  afterAll(() => {
    if (originalDebug === undefined) {
      delete process.env.DEBUG
    } else {
      process.env.DEBUG = originalDebug
    }
  })

  test('error logs without DEBUG flag', () => {
    logger.error('Test error message')

    expect(console.error).toHaveBeenCalledTimes(1)
    const [firstCall] = console.error.mock.calls
    expect(firstCall[0]).toContain('[ERROR]')
  })

  test('warn logs without DEBUG flag', () => {
    logger.warn('Test warning message')

    expect(console.warn).toHaveBeenCalledTimes(1)
    const [firstCall] = console.warn.mock.calls
    expect(firstCall[0]).toContain('[WARNING]')
  })

  test('success logs without DEBUG flag', () => {
    logger.success('Test success message')

    expect(console.log).toHaveBeenCalledTimes(1)
    const [firstCall] = console.log.mock.calls
    expect(firstCall[0]).toContain('[SUCCESS]')
  })

  test('debug remains silent without DEBUG flag', () => {
    logger.debug('Detailed debug message')

    expect(console.log).not.toHaveBeenCalled()
  })
})
