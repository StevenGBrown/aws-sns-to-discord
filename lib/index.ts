import { Construct } from 'constructs'
import {
  Arn,
  type ArnComponents,
  Duration,
  Stack,
  Token,
  aws_lambda,
  aws_lambda_event_sources,
  aws_lambda_nodejs,
  aws_logs,
  aws_sns,
} from 'aws-cdk-lib'

import { validateDiscordConfig } from './discord.js'

type ExistingTopic =
  | aws_sns.ITopic
  | ExistingTopicArn
  | ExistingTopicArnComponents
type ExistingTopicArn = string
type ExistingTopicArnComponents = Omit<
  ArnComponents,
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
  readonly lambdaFunctionProps?: aws_lambda_nodejs.NodejsFunctionProps
}

/**
 * @summary The AwsSnsToDiscord class.
 */
export class AwsSnsToDiscord extends Construct {
  public readonly lambdaFunction: aws_lambda_nodejs.NodejsFunction
  public readonly topics: aws_sns.ITopic[] = []

  constructor(scope: Construct, id: string, props: AwsSnsToDiscordProps) {
    super(scope, id)

    // Validation
    if (!props.discordWebhookUrls.length) {
      throw new Error(
        'Provide at least one item in the discordWebhookUrls array'
      )
    }
    validateDiscordConfig(props)

    // Lambda function bundled using esbuild
    const { functionName } = {
      functionName: 'aws-sns-to-discord',
      ...props.lambdaFunctionProps,
    }
    this.lambdaFunction = new aws_lambda_nodejs.NodejsFunction(this, 'lambda', {
      functionName,
      runtime: aws_lambda.Runtime.NODEJS_24_X,
      environment: {
        DISCORD_WEBHOOK_URLS: props.discordWebhookUrls.join(' '),
        NODE_OPTIONS: '--enable-source-maps',
        ...props.lambdaFunctionProps?.environment,
      },
      logGroup: new aws_logs.LogGroup(this, 'lambda-logGroup', {
        logGroupName: functionName ? `/aws/lambda/${functionName}` : undefined,
        retention: aws_logs.RetentionDays.ONE_MONTH,
      }),
      timeout: Duration.minutes(1),
      bundling: {
        sourceMap: true,
        target: 'es2024',
        ...props.lambdaFunctionProps?.bundling,
      },
      ...props.lambdaFunctionProps,
    })

    // Subscribe to existing SNS topics (optional)
    for (const existingTopic of props.existingTopics ?? []) {
      const topic = this.resolveTopic(existingTopic)
      this.lambdaFunction.addEventSource(
        new aws_lambda_event_sources.SnsEventSource(topic)
      )
      this.topics.push(topic)
    }
  }

  private resolveTopic(existingTopic: ExistingTopic): aws_sns.ITopic {
    if (typeof existingTopic === 'object' && 'topicArn' in existingTopic) {
      return existingTopic
    }
    const topicArn = this.resolveTopicArn(existingTopic)
    this.validateTopicArn({ topicArn, existingTopic })
    const id = this.createTopicId()
    return aws_sns.Topic.fromTopicArn(this, id, topicArn)
  }

  private resolveTopicArn(
    existingTopic: ExistingTopicArn | ExistingTopicArnComponents
  ): string {
    if (typeof existingTopic === 'string') {
      return existingTopic
    }
    return Arn.format({ service: 'sns', ...existingTopic }, Stack.of(this))
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
    if (!Token.isUnresolved(topicArn) && !topicArn.startsWith('arn:aws:sns:')) {
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
