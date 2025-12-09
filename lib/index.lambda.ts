import type { SNSEvent } from 'aws-lambda'

import { constructDiscordMessage } from './construct-discord-message.js'
import {
  type DiscordConfig,
  validateDiscordConfig,
  sendDiscordMessage,
} from './discord.js'

export async function handler(event: SNSEvent | undefined) {
  console.log(`\n${JSON.stringify(event, null, 2)}`)

  const config = getDiscordConfig()
  validateDiscordConfig(config)

  for (const record of event?.Records ?? []) {
    const message = constructDiscordMessage(record)
    if (message) {
      await sendDiscordMessage({ config, message })
    } else {
      console.warn('Unrecognized notification')
    }
  }
}

function getDiscordConfig(): DiscordConfig {
  const discordWebhookUrls = process.env.DISCORD_WEBHOOK_URLS
  if (!discordWebhookUrls) {
    throw new Error(
      'Environment variable DISCORD_WEBHOOK_URLS has not been configured'
    )
  }
  return { discordWebhookUrls: discordWebhookUrls.split(/ /g) }
}
