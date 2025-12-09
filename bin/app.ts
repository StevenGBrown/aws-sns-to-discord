import { Construct } from 'constructs'
import { App, Stack } from 'aws-cdk-lib'

import { AwsSnsToDiscord } from '../lib/index.js'

class AwsSnsToDiscordStack extends Stack {
  constructor(scope: Construct, id: string) {
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
  const app = new App()
  new AwsSnsToDiscordStack(app, 'AwsSnsToDiscordStack')
}
