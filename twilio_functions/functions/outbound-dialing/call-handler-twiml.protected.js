const nodeFetch = require("node-fetch");
const webhooks = require("twilio/lib/webhooks/webhooks");

function getTwilioSignature(auth_token, url, params) {
	return webhooks.getExpectedTwilioSignature(auth_token, url, params);
  }
  
async function identifyByAttributes(identifying_attributes, context) {
  const identificationUrl = new URL(
    "https://" + context.DOMAIN_NAME + "/outbound-dialing/identify-callee"
  );

  identificationUrl.searchParams.append("identifying_attributes", JSON.stringify(identifying_attributes))

  const fetchResponse = await nodeFetch(identificationUrl, {
    method: "GET",
    headers: {
      "X-Twilio-Signature": getTwilioSignature(
        context.AUTH_TOKEN,
        identificationUrl.href,
        {}
      )
    }
  });
  try {
    const fetched_response = await fetchResponse.json();
    console.log("Identification response", fetched_response);
    return fetched_response;
  } catch(_) {
    console.log("Error trying to identify the callee");
	  return Promise.resolve({});
  }
}

exports.handler = async function(context, event, callback) {
  console.log("callhandler for: ", event.CallSid);
  console.log("worker:", event.workerContactUri);
  console.log("to:", event.To);
  const identificationAttributes = await identifyByAttributes(
    { phone_number: event.To },
    context
  );
  console.log("identification:", identificationAttributes);
  console.log("workflowSid:", context.TWILIO_WORKFLOW_SID);

  var taskAttributes = {
    targetWorker: event.workerContactUri,
    autoAnswer: "true",
    type: "outbound",
    direction: "outbound",
    identification: identificationAttributes,
    name: event.To
  };

  let twiml = new Twilio.twiml.VoiceResponse();

  var enqueue = twiml.enqueue({
    workflowSid: `${context.TWILIO_WORKFLOW_SID}`
  });

  enqueue.task(JSON.stringify(taskAttributes));
  console.log("Sending Twiml back");
  callback(null, twiml);
};
