import * as discordjs from 'discord.js'
import * as util from 'util'

export interface DiscordConfig {
  discordWebhookUrls: readonly string[]
}

export interface DiscordMessage {
  content?: string
  files?: readonly {
    attachment: Buffer
    name: string
  }[]
}

export const MAX_CONTENT_LENGTH = 2000

export function validateDiscordConfig(config: DiscordConfig): void {
  for (const webhookUrl of config.discordWebhookUrls) {
    createWebhookClient(webhookUrl).destroy()
  }
}

export async function sendDiscordMessage({
  config,
  message,
}: {
  config: DiscordConfig
  message: DiscordMessage
}): Promise<void> {
  const content = getContent(message)
  const options = getOptions(message)

  const tasks = config.discordWebhookUrls.map((webhookUrl) =>
    send({ webhookUrl, content, options })
  )
  const results = await Promise.allSettled(tasks)
  if (results.some((result) => result.status === 'rejected')) {
    throw new Error(util.inspect(results, { depth: null }))
  }
}

function createWebhookClient(webhookUrl: string): discordjs.WebhookClient {
  const match = webhookUrl.match(/\/([^/]+)\/([^/]+)$/i)
  if (!match) {
    throw new Error(`Invalid Discord webhook URL: "${webhookUrl}"`)
  }
  const [id, token] = match.slice(1)
  return new discordjs.WebhookClient(id, token)
}

function getContent(message: DiscordMessage): string {
  const content = message.content ?? ''
  if (content.length <= MAX_CONTENT_LENGTH) {
    return content
  }
  const ellipsis = ' ...'
  const newLength = MAX_CONTENT_LENGTH - ellipsis.length
  console.warn(
    `Message content was trimmed from ${content.length} to ${newLength} characters`
  )
  return content.substring(0, newLength) + ellipsis
}

function getOptions(message: DiscordMessage): discordjs.WebhookMessageOptions {
  const { files } = message
  return {
    ...(files?.length ? { files: [...files] } : {}),
  }
}

async function send({
  webhookUrl,
  content,
  options,
}: {
  webhookUrl: string
  content: string
  options: discordjs.WebhookMessageOptions
}): Promise<void> {
  const webhookClient = createWebhookClient(webhookUrl)
  try {
    await webhookClient.send(content, options)
  } finally {
    webhookClient.destroy()
  }
}
