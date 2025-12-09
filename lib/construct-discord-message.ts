import type { SNSEventRecord } from 'aws-lambda'
import { get } from 'lodash'

import { type DiscordMessage, MAX_CONTENT_LENGTH } from './discord.js'

export function constructDiscordMessage(
  record: SNSEventRecord
): DiscordMessage | undefined {
  return (
    discordMessageForCloudwatchAlarm(record) ??
    discordMessageForAwsHealth(record)
  )
}

function discordMessageForCloudwatchAlarm(
  record: SNSEventRecord
): DiscordMessage | undefined {
  const parsed = parseSnsMessage(record)
  const alarmName = getString(parsed, 'AlarmName')

  if (alarmName) {
    return { content: alarmName }
  }
}

function discordMessageForAwsHealth(
  record: SNSEventRecord
): DiscordMessage | undefined {
  const parsed = parseSnsMessage(record)
  const detailType = getString(parsed, 'detail-type')
  const latestDescription = getString(
    parsed,
    'detail.eventDescription[0].latestDescription'
  )
  const service = getString(parsed, 'detail.service')

  if (detailType && service && latestDescription) {
    const title = `${detailType}\n${service}`
    const fullContent = `${title}\n\n${latestDescription}`
    return fullContent.length > MAX_CONTENT_LENGTH
      ? {
          content: title,
          files: [
            { attachment: Buffer.from(latestDescription), name: 'message.txt' },
          ],
        }
      : { content: fullContent }
  }
}

function parseSnsMessage(record: SNSEventRecord): unknown {
  try {
    return JSON.parse(record.Sns.Message) as unknown
  } catch {
    // not in JSON format
  }
}

function getString(object: unknown, path: string): string | null {
  const value = get(object, path) as unknown
  return typeof value === 'string' ? value : null
}
