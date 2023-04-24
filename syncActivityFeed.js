async function getActivityFeed(integrationDetails, mongodbSecret, minDate, itemsPerPage, pageNum) {
  const activityFeed = await context.http.get({
    scheme: "https",
    host: "cloud.mongodb.com",
    path: `/api/atlas/v1.0/groups/${integrationDetails.mongodb.projectId}/events`,
    query: {
      minDate: [minDate],
      itemsPerPage: [itemsPerPage.toString()],
      pageNum: [pageNum.toString()],
      clusterNames: integrationDetails.mongodb.clusterNames,
      eventType: integrationDetails.mongodb.eventType,
    },
    headers: {
      "Content-Type": ["application/json"],
      Accept: ["application/json"],
    },
    body: {
      username: integrationDetails.mongodb.clientId,
      apiKey: mongodbSecret,
    },
    digestAuth: true,
    username: integrationDetails.mongodb.clientId,
    password: mongodbSecret,
    encodeBodyAsJSON: true,
  });

  const feed = await JSON.parse(activityFeed.body.text());
  return feed;
}

exports = async function (arg) {
  try {
    const integrationDetails = context.values.get("mongodb-slack-activityfeed");
    const mongodbSecret = context.values.get("mongodb-secret");
    const slackToken = context.values.get("slack-bot-oauth-token");
    /*This value needs to be aligned to the scheduled trigger execution time in AppServices
    in order to not miss any events. For example 5 mins here and the scheduled trigger should also be set to execute every 5 mins*/
    const howManyMinutesAgoToCheck = 5;
    const someMinutesAgo = new Date(
      Date.now() - howManyMinutesAgoToCheck * 1000 * 60
    ).toISOString();
    const itemsPerPage = 50;
    
    var itemsRetrieved = 0;
    var pageNum = 1;

    var feed = await getActivityFeed(integrationDetails, mongodbSecret, someMinutesAgo, itemsPerPage, pageNum);
    var totalCount = feed.totalCount;

    if (totalCount == -0) return "NO ACTIVITY FEED TO SYNC";

    //Following code is in charge of handling the pagination in case there are more results than 50
    while (feed.results && feed.results.length > 0) {
      itemsRetrieved += feed.results.length;
      await feed.results.forEach(async (currentValue) => {
        /*
        This builds the message in Slack. If more customization is needed
        Please follow the slack specs: https://app.slack.com/block-kit-builder/
        
        Also, depending on the event triggered by atlas there could be more info in the details
        Full speck in here: https://www.mongodb.com/docs/atlas/reference/api/events-projects-get-all/#results-embedded-document
        */
        const payload = {
          channel: integrationDetails.slack.channel,
          blocks: [
            {
              type: "divider",
            },
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `${currentValue.clusterName}`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `Project ID: ${currentValue.groupId}`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*${currentValue.eventTypeName}*`,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "plain_text",
                  text: `Event time: ${currentValue.created}`,
                },
              ],
            },
          ],
        };
        if (currentValue.username) {
          payload.blocks.push({
            type: "context",
            elements: [
              {
                type: "plain_text",
                text: `Triggered From: ${currentValue.remoteAddress} \nBy: ${currentValue.username}`,
              },
            ],
          });
        }

        const sendSlackmessage = await context.http.post({
          scheme: "https",
          host: "slack.com",
          path: `/api/chat.postMessage`,
          headers: {
            "Content-Type": ["application/json"],
            Accept: ["application/json"],
            Authorization: [`Bearer ${slackToken}`],
          },
          body: payload,
          encodeBodyAsJSON: true,
        });
      });

      if (itemsRetrieved < totalCount) pageNum++;
      else break;

      feed = await getActivityFeed(integrationDetails, mongodbSecret, someMinutesAgo, itemsPerPage, pageNum);
    }
    return `OK ${itemsRetrieved} events synced`;
  } catch (error) {
    console.log(error);
    return "ERROR";
  }
};
