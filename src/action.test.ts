const mockRunConfigureAwsCredentials = jest.fn()

const mockGetIDToken = jest.fn().mockResolvedValue('my-web-identity-token')
const mockSetFailed = jest.fn()
const mockExportVariable = jest.fn()

const mockContext = jest.fn()

const mockMappingObjectContent = jest.fn()

jest.mock('aws-actions-configure-aws-credentials', () => ({
  run: () => mockRunConfigureAwsCredentials(),
}))

jest.mock('aws-sdk', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  WebIdentityCredentials: jest.fn().mockImplementation(() => {
    /* void */
  }),
  S3: jest.fn().mockImplementation(() => ({
    getObject(...args: unknown[]) {
      return {
        promise() {
          return {
            Body: mockMappingObjectContent(...args),
          }
        },
      }
    },
  })),
}))

jest.mock('@actions/core', () => ({
  getIDToken: (...args: unknown[]) => mockGetIDToken(...args),
  getInput: jest.requireActual('@actions/core').getInput,
  setFailed: (...args: unknown[]) => mockSetFailed(...args),
  exportVariable: (...args: unknown[]) => mockExportVariable(...args),
}))

jest.mock('@actions/github', () => ({
  get context() {
    return mockContext()
  },
}))

const expectError = (message: string | RegExp) =>
  expect.objectContaining({
    message: expect.stringMatching(message),
  })

const mockMappings = (mappings: RepositoriesMappings) =>
  mockMappingObjectContent.mockReturnValue(JSON.stringify(mappings))

import { run } from './action'

describe('action', () => {
  const OLD_ENV = process.env

  beforeAll(() => {
    process.env['INPUT_CONFIG'] = JSON.stringify({
      roleArn: 'dummy-role-arn',
      mappingBucket: 'dummy-bucket',
      mappingKey: 'dummy-key',
    })
  })

  beforeEach(() => {
    jest.resetModules()
    jest.spyOn(console, 'trace').mockImplementation(() => {
      /* void */
    })
    process.env = { ...OLD_ENV }
  })

  afterEach(() => {
    mockSetFailed.mockReset()
    mockExportVariable.mockReset()
    mockContext.mockReset()
    mockMappingObjectContent.mockReset()

    process.env = OLD_ENV
  })

  it('fail on pull_request event', async () => {
    mockContext.mockReturnValue({
      eventName: 'pull_request',
    })

    await run()

    expect(mockSetFailed).toBeCalledWith(
      expectError(/pull requests are not supported/),
    )
  })

  it('fail on not mapped repo', async () => {
    mockContext.mockReturnValue({
      eventName: 'push',
      repo: {
        repo: 'test-repo',
      },
    })

    mockMappingObjectContent.mockReturnValue(
      JSON.stringify({
        'test-repo-2': {},
      }),
    )

    await run()

    expect(mockSetFailed).toBeCalledWith(
      expectError(/epository .* is not mapped to any AWS account/),
    )
  })

  it('fail on empty mapping', async () => {
    mockContext.mockReturnValue({
      eventName: 'push',
      repo: {
        repo: 'test-repo',
      },
    })

    mockMappings({
      'test-repo': {},
    })

    await run()

    expect(mockSetFailed).toBeCalledWith(
      expectError(/repository .* is not mapped to any AWS account/),
    )
  })

  it('fail on multiple-mappings', async () => {
    mockContext.mockReturnValue({
      eventName: 'push',
      repo: {
        repo: 'test-repo',
      },
      ref: 'refs/heads/main',
    })

    mockMappings({
      'test-repo': {
        mapping1: {
          refs: ['refs/heads/main'],
          roles: {},
        },
        mapping2: {
          refs: ['refs/heads/main'],
          roles: {},
        },
      },
    })

    await run()

    expect(mockSetFailed).toBeCalledWith(
      expectError(/More than 1 mapping found for this repo/),
    )
  })

  it('fail on unknown mapping', async () => {
    mockContext.mockReturnValue({
      eventName: 'push',
      repo: {
        repo: 'test-repo',
      },
      ref: 'refs/heads/main',
    })

    mockMappings({
      'test-repo': {
        mapping: {
          refs: ['refs/heads/main'],
          roles: {},
        },
      },
    })

    process.env['INPUT_NAME'] = 'mapping2'

    await run()

    expect(mockSetFailed).toBeCalledWith(
      expectError(/Mapping with name '.*' not found/),
    )
  })

  it('fail on multi-account without crossAccounrRole', async () => {
    mockContext.mockReturnValue({
      eventName: 'push',
      repo: {
        repo: 'test-repo',
      },
      ref: 'refs/heads/main',
    })

    mockMappings({
      'test-repo': {
        mapping: {
          refs: ['refs/heads/main'],
          roles: {
            dev: 'dev-role',
          },
        },
      },
    })

    process.env['INPUT_MULTI-ACCOUNT'] = 'true'

    await run()

    expect(mockSetFailed).toBeCalledWith(
      expectError(
        /The mapping '.*' is not a multi-account mapping, but multi-account was requested/,
      ),
    )
  })

  it('fail on multiple accounts without account input', async () => {
    mockContext.mockReturnValue({
      eventName: 'push',
      repo: {
        repo: 'test-repo',
      },
      ref: 'refs/heads/main',
    })

    mockMappings({
      'test-repo': {
        mapping: {
          refs: ['refs/heads/main'],
          roles: {
            dev: 'dev-role',
            prod: 'prod-role',
          },
        },
      },
    })

    await run()

    expect(mockSetFailed).toBeCalledWith(
      expectError(
        /The mapping '.*' contains multple accounts, but account parameter was not set/,
      ),
    )
  })

  it('fail on incorrect account', async () => {
    mockContext.mockReturnValue({
      eventName: 'push',
      repo: {
        repo: 'test-repo',
      },
      ref: 'refs/heads/main',
    })

    mockMappings({
      'test-repo': {
        mapping: {
          refs: ['refs/heads/main'],
          roles: {
            dev: 'dev-role',
            prod: 'prod-role',
          },
        },
      },
    })

    process.env['INPUT_ACCOUNT'] = 'test'

    await run()

    expect(mockSetFailed).toBeCalledWith(
      expectError(/The mapping mapping does not have account '.*' assigned/),
    )
  })

  it('fail on multi-account and account input', async () => {
    mockContext.mockReturnValue({
      eventName: 'push',
      repo: {
        repo: 'test-repo',
      },
      ref: 'refs/heads/main',
    })

    mockMappings({
      'test-repo': {
        mapping: {
          refs: ['refs/heads/main'],
          roles: {
            dev: 'dev-role',
          },
        },
      },
    })

    process.env['INPUT_ACCOUNT'] = 'test'
    process.env['INPUT_MULTI-ACCOUNT'] = 'true'

    await run()

    expect(mockSetFailed).toBeCalledWith(
      expectError(/Both account and multi-account attributes are specified/),
    )
  })

  it('simple mapping', async () => {
    mockContext.mockReturnValue({
      eventName: 'push',
      repo: {
        repo: 'test-repo',
      },
      ref: 'refs/heads/main',
    })

    mockMappings({
      'test-repo': {
        mapping: {
          refs: ['refs/heads/main'],
          roles: {
            dev: 'dev-role',
          },
        },
      },
    })

    await run()

    expect(mockExportVariable).toBeCalledWith(
      'AWS_AVAILABLE_ROLES',
      JSON.stringify({
        dev: 'dev-role',
      }),
    )
    expect(process.env['INPUT_ROLE-TO-ASSUME']).toBe('dev-role')
    expect(mockRunConfigureAwsCredentials).toBeCalled()
    expect(mockSetFailed).not.toBeCalled()
  })

  it('multi-account mapping', async () => {
    mockContext.mockReturnValue({
      eventName: 'push',
      repo: {
        repo: 'test-repo',
      },
      ref: 'refs/heads/main',
    })

    mockMappings({
      'test-repo': {
        mapping: {
          crossAccountRole: 'cross-account-role',
          refs: ['refs/heads/main'],
          roles: {
            dev: 'dev-role',
          },
        },
      },
    })

    process.env['INPUT_MULTI-ACCOUNT'] = 'true'

    await run()

    expect(mockExportVariable).toBeCalledWith(
      'AWS_AVAILABLE_ROLES',
      JSON.stringify({
        dev: 'dev-role',
      }),
    )
    expect(process.env['INPUT_ROLE-TO-ASSUME']).toBe('cross-account-role')
    expect(mockRunConfigureAwsCredentials).toBeCalled()
    expect(mockSetFailed).not.toBeCalled()
  })

  it('named account mapping', async () => {
    mockContext.mockReturnValue({
      eventName: 'push',
      repo: {
        repo: 'test-repo',
      },
      ref: 'refs/heads/main',
    })

    mockMappings({
      'test-repo': {
        mapping: {
          refs: ['refs/heads/main'],
          roles: {
            dev: 'dev-role',
            prod: 'prod-role',
            test: 'test-role',
          },
        },
      },
    })

    process.env['INPUT_ACCOUNT'] = 'prod'

    await run()

    expect(mockExportVariable).toBeCalledWith(
      'AWS_AVAILABLE_ROLES',
      JSON.stringify({
        dev: 'dev-role',
        prod: 'prod-role',
        test: 'test-role',
      }),
    )
    expect(process.env['INPUT_ROLE-TO-ASSUME']).toBe('prod-role')
    expect(mockRunConfigureAwsCredentials).toBeCalled()
    expect(mockSetFailed).not.toBeCalled()
  })
})
