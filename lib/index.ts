import * as lambda from '@aws-cdk/aws-lambda'
import { SnsEventSource } from '@aws-cdk/aws-lambda-event-sources'
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs'
import * as logs from '@aws-cdk/aws-logs'
import * as sns from '@aws-cdk/aws-sns'
import * as cdk from '@aws-cdk/core'

import { validateDiscordConfig } from './discord'

type ExistingTopic = sns.ITopic | ExistingTopicArn | ExistingTopicArnComponents
type ExistingTopicArn = string
type ExistingTopicArnComponents = Omit<
  cdk.ArnComponents,
  'service' | 'resourceName'
>

/**
 * @summary The properties for the AwsSnsToDiscord class.
 */
export interface AwsSnsToDiscordProps {
  /**
   * Existing SNS topics that will be added as event sources for the Lambda function.
   *
   * Events that are sent to these SNS topics will be summarized and sent to Discord by the Lambda function.
   *
   * Each SNS topic can be provided as an SNS Topic object, an ARN string or ArnComponents object.
   *
   * @default - The Lambda function will not be subscribed to any SNS topics by this construct.
   */
  readonly existingTopics?: readonly ExistingTopic[]

  /**
   * The Discord webhook URLs to which the Lambda function will send each message.
   *
   * At least one URL is required.
   */
  readonly discordWebhookUrls: readonly string[]

  /**
   * User provided properties to override the default properties for the Lambda function.
   *
   * @default - Default properties are used.
   */
  readonly lambdaFunctionProps?: lambdaNodejs.NodejsFunctionProps
}

/**
 * @summary The AwsSnsToDiscord class.
 */
export class AwsSnsToDiscord extends cdk.Construct {
  public readonly lambdaFunction: lambdaNodejs.NodejsFunction
  public readonly topics: sns.ITopic[] = []

  constructor(scope: cdk.Construct, id: string, props: AwsSnsToDiscordProps) {
    super(scope, id)

    // Validation
    if (!props.discordWebhookUrls.length) {
      throw new Error(
        'Provide at least one item in the discordWebhookUrls array'
      )
    }
    validateDiscordConfig(props)

    // Lambda function bundled using esbuild
    this.lambdaFunction = new lambdaNodejs.NodejsFunction(this, 'lambda', {
      runtime: lambda.Runtime.NODEJS_14_X,
      environment: {
        DISCORD_WEBHOOK_URLS: props.discordWebhookUrls.join(' '),
        NODE_OPTIONS: '--enable-source-maps',
        ...props.lambdaFunctionProps?.environment,
      },
      logRetention: logs.RetentionDays.ONE_MONTH,
      timeout: cdk.Duration.minutes(1),
      bundling: {
        sourceMap: true,
        target: 'es2020',
        // Dependencies to exclude from the build
        externalModules: [
          'aws-sdk', // already available in the lambda runtime
          'ffmpeg-static', // dependency of discord.js that isn't used at runtime
        ],
        ...props.lambdaFunctionProps?.bundling,
      },
      ...props.lambdaFunctionProps,
    })

    // Subscribe to existing SNS topics (optional)
    for (const existingTopic of props.existingTopics ?? []) {
      const topic = this.resolveTopic(existingTopic)
      this.lambdaFunction.addEventSource(new SnsEventSource(topic))
      this.topics.push(topic)
    }
  }

  private resolveTopic(existingTopic: ExistingTopic): sns.ITopic {
    if (typeof existingTopic === 'object' && 'topicArn' in existingTopic) {
      return existingTopic
    }
    const topicArn = this.resolveTopicArn(existingTopic)
    this.validateTopicArn({ topicArn, existingTopic })
    const id = this.createTopicId()
    return sns.Topic.fromTopicArn(this, id, topicArn)
  }

  private resolveTopicArn(
    existingTopic: ExistingTopicArn | ExistingTopicArnComponents
  ): string {
    if (typeof existingTopic === 'string') {
      return existingTopic
    }
    return cdk.Arn.format(
      { service: 'sns', ...existingTopic },
      cdk.Stack.of(this)
    )
  }

  private validateTopicArn({
    topicArn,
    existingTopic,
  }: {
    topicArn: string
    existingTopic: ExistingTopicArn | ExistingTopicArnComponents
  }): void {
    if (!topicArn.length) {
      throw new Error('Invalid SNS topic. An empty string was provided.')
    }
    if (
      !cdk.Token.isUnresolved(topicArn) &&
      !topicArn.startsWith('arn:aws:sns:')
    ) {
      throw new Error(`Invalid SNS topic ${JSON.stringify(existingTopic)}.`)
    }
  }

  private createTopicId(): string {
    let index = 0
    for (;;) {
      const id = `SnsTopic-${index}`
      if (this.topics.every((topic) => topic.node.id !== id)) {
        return id
      }
      index++
    }
  }
}
