import * as cdk from '@aws-cdk/core'

import { AwsSnsToDiscord } from '../lib'

class AwsSnsToDiscordStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string) {
    super(scope, id, {
      description: 'https://github.com/StevenGBrown/aws-sns-to-discord',
    })

    new AwsSnsToDiscord(this, 'AwsSnsToDiscord', {
      existingTopics: process.env.EXISTING_TOPICS?.split(',').map(
        (resource) => ({ resource })
      ),
      discordWebhookUrls: process.env.DISCORD_WEBHOOK_URLS?.split(',') ?? [],
      lambdaFunctionProps: { functionName: 'aws-sns-to-discord' },
    })
  }
}

if (!process.env.npm_lifecycle_script?.includes('cdk "bootstrap"')) {
  const app = new cdk.App()
  new AwsSnsToDiscordStack(app, 'AwsSnsToDiscordStack')
}
