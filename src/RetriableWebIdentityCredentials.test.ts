import { RetriableWebIdentityCredentials } from './RetriableWebIdentityCredentials'
import * as AWS from 'aws-sdk'

describe('test retry', () => {
  beforeAll(() => {
    jest.resetModules()
  })

  it('retry 3 times', async () => {
    AWS.WebIdentityCredentials.prototype.refresh = jest
      .fn()
      .mockImplementation(callback => {
        callback('error')
      })

    const creds = new RetriableWebIdentityCredentials({
      RoleArn: 'dummy-role',
      RoleSessionName: 'dummy-session',
      WebIdentityToken: 'dummy-token',
      MaxRetries: 3,
    })

    await new Promise(resolve =>
      creds.refresh(() => {
        resolve(null)
      }),
    )

    expect(AWS.WebIdentityCredentials.prototype.refresh).toBeCalledTimes(4)
  })
})
