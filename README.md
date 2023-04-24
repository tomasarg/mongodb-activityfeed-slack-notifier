# MongoDB Atlas Activity Feed sync with Slack

This script should fetch Activity Feed data from the MongoDB Atlas Admin API for a specific project and send it to a Slack Channel

This script could be easily modified to accomodate more complex needs

## **Pre Requisite**

- An apiKey with _Project Scope_ and _Project Read Only_ permissions needs to be [created](https://www.mongodb.com/docs/atlas/configure-api-access/#std-label-create-org-api-key) **Make sure to write down the details of the apiKey created**
- A new app in your Slack wotkspace needs to be created [Full instructions here](https://api.slack.com/bot-users)
    1. [Create a new app](https://api.slack.com/apps)
    2. Create a bot user
    3. Add scopes (the only required one is `chat:write`)
    4. Copy the **Bot User OAuth Token** from the _OAuth & Permissions_ section
- In your Slack workspace its recommended to create a dedicated channel to recieve all the notifications
    - Once the channel has been created, the bot needs to be [manually added to the channel](https://slack.com/intl/en-au/help/articles/202035138-Add-apps-to-your-Slack-workspace)
        -This can also be done on the Channel settings, via the Integrations tab

## **Script Instalation**

A new AppServices app needs to be [created](https://www.mongodb.com/docs/atlas/app-services/apps/create/) (You could reuse an existing one, its up to how you want to organize your apps)

_Usually a MongoDB Atlas AppService app is linked to a datasource (mongodb atlas cluster), in this case this is not required. If asked to link a datasource just skip or add any of the available sources_

Once the application has been created, we will need to create the function and the config stored as App Values.

Before that, make sure to replace the config file `values/mongodb-slack-activityfeed.json` inside this repo with real values
- Replace **mongodb.clientId** with the clientId of the MongoDB Atlas Project apiKey
- Replace **mongodb.projectId** with the MongoDB Atlas projectId to monitor
- Replace **mongodb.clusterNames** specify as an array of strings all the clusters inside the previously indicated project that you woulk like to get notifications _(Use the display name of the clusters)_
- Replace **mongodb.eventType** specify as an array of strings all the events you would like notifications. To get the list of events check [Event Type Values](https://www.mongodb.com/docs/atlas/reference/api/events-projects-get-all/#event-type-values). _(If all event types are needed leave as an empty array). Also have in mind that these events types change frequently_

### Create values

In the Values section of your App inside AppServices create the following _Values_
- **mongodb-secret** as a _secret_
    - The value is the secret of your MongoDB Project apiKey created previously
- **slack-bot-oauth-token** as a _secret_
    - The value is the oauth bot token from your slack workspace
- **mongodb-slack-activityfeed** as a _value_ with _custom content_
    - The value can be found in the file `values/mongodb-slack-activityfeed.json` inside this repo
- **slack-bot-oauth-token** as a _value_ with _link to secret_
    - The value will be the secret we created previously with name _slack-bot-oauth-token_
- **mongodb-secret** as a _value_ with _link to secret_
    - The value will be the secret we created previously with name _mongodb-secret_

### Create the [function](https://www.mongodb.com/docs/atlas/app-services/functions/)

This function should have **Authentication** with _System ID_ and it should be set as **Private**

Create a new function with the code inside `syncActivityFeed.js` in this repo
This script reads from all the previously created values. The only value that might need to be changed is the frequency inside the variable `howManyMinutesAgoToCheck` (By default is 5 mins).

This value should be aligned with the scheduled trigger periodicity that we will create later (5 mins for both for example), in order to avoid missing events

### Create the trigger

Following the instructions [here](https://www.mongodb.com/docs/atlas/app-services/triggers/scheduled-triggers/) create a scheduled trigger that calls the function we just created on a 5 mins scheduler (Feel free to change this value just keep in mind the notes from before)