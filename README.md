# aws-sns-to-discord

AWS lambda that receives events from SNS topics and sends a summary to Discord.

It recognizes these events from SNS:

- Cloudwatch Alarm events
- Personal Health Dashboard events

## Requirements

- AWS account and credentials
- Node 24 or higher
- npm 9 or higher

## How to deploy to AWS

- Configure your AWS credentials and region.  
  https://docs.aws.amazon.com/cdk/latest/guide/cli.html#cli-environment

- `git clone https://github.com/StevenGBrown/aws-sns-to-discord`
- `cd aws-sns-to-discord`
- `npm run bootstrap` (if you haven't used the AWS CDK in this account/region before)

- Define the following environment variables:
  - `EXISTING_TOPICS`:  
    Comma-separated list of SNS topic names for which you want to produce Discord messages.
  - `DISCORD_WEBHOOK_URLS`:  
    Comma separated list of Discord webhook URLs for the channels that will receive those messages.  
    To make a Discord webhook, see https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks

- `npm run deploy`

## Advanced configuration

For greater control over the deployment, edit `bin/app.ts` instead of using the environment variables.

VSCode recommended.

## Commands

- `npm run build`  
  Run when first cloning the repository or when checking out a different commit.

- `npm run check`  
  Check all the things, e.g. linting and tests.

- `npm run bootstrap`  
  Bootstrap the AWS CDK in your default AWS account/region.  
  https://docs.aws.amazon.com/cdk/latest/guide/cli.html#cli-bootstrap

- `npm run deploy`  
  Deploy the app to your default AWS account/region.

- `npm run upgrade`  
  Upgrade the dependencies.
