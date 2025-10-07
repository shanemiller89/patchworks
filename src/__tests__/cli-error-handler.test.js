const mockLoggerError = jest.fn()

let createOutputErrorHandler

beforeAll(async () => {
  jest.resetModules()

  jest.doMock('../../reports/logger.js', () => ({
    __esModule: true,
    default: {
      error: mockLoggerError,
      warn: jest.fn(),
      success: jest.fn(),
    },
    error: mockLoggerError,
    warn: jest.fn(),
    success: jest.fn(),
  }))

  ;({ createOutputErrorHandler } = await import('../cli/errorHandler.ts'))
})

describe('createOutputErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    delete process.env.DEBUG
  })

  test('logs errors via logger and triggers help', () => {
    const help = jest.fn()
    const write = jest.fn()
    const handler = createOutputErrorHandler({ help })

    handler('  error: unknown command invalid\n', write)

    expect(write).toHaveBeenCalledWith('')
    expect(mockLoggerError).toHaveBeenCalledWith(
      'error: unknown command invalid',
    )
    expect(help).toHaveBeenCalled()
    expect(process.env.DEBUG).toBeUndefined()
  })
})
