import * as AWS from 'aws-sdk'

export interface RetriableWebIdentityCredentialsOptions
  extends AWS.WebIdentityCredentials.WebIdentityCredentialsOptions {
  MaxRetries?: number
}

export class RetriableWebIdentityCredentials extends AWS.WebIdentityCredentials {
  public MaxRetries: number
  constructor(
    { MaxRetries = 10, ...options }: RetriableWebIdentityCredentialsOptions,
    clientConfig?: AWS.ConfigurationOptions,
  ) {
    super(options, clientConfig)
    this.MaxRetries = MaxRetries
  }

  refresh(callback: (err?: AWS.AWSError) => void): void {
    const tryRefresh = (retries = 0) => {
      super.refresh(error => {
        if (error) {
          if (retries < this.MaxRetries) {
            setTimeout(() => tryRefresh(retries + 1), 50 * Math.pow(2, retries))
          } else {
            callback(error)
          }
        } else {
          callback()
        }
      })
    }
    tryRefresh()
  }
}
