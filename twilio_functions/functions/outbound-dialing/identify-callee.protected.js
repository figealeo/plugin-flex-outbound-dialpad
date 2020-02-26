const nodeFetch = require("node-fetch");
const webhooks = require("twilio/lib/webhooks/webhooks");

function getTwilioSignature(auth_token, url, params) {
  return webhooks.getExpectedTwilioSignature(auth_token, url, params);
}

/**
 * Resolve only if the user is identified! Need to be used with a timeout rejecting promise
 * @param {*} backend_host
 * @param {*} task_attributes
 */
async function identify_from_task_attributes(
  backend_host,
  identifying_attributes,
  context
) {
  const identification_url = new URL(
    "https://" + backend_host + "/v1/pet_parents/by_phone"
  );

  Object.keys(identifying_attributes).forEach(key =>
    identification_url.searchParams.append(key, identifying_attributes[key])
  );

  const request = await nodeFetch(identification_url, {
    method: "GET",
    headers: {
      "X-Twilio-Signature": getTwilioSignature(
        context.AUTH_TOKEN,
        encodeURI(identification_url.href),
        {}
      )
    }
  });

  const parsed_result = await request.json();
  return {
    pet_parent_id: parsed_result.petParent.id,
    partner_backend_host: backend_host
  };
}

/**
 * This function tries to identify the pet and pet parent from the given task attributes.
 * Usefull for Outbound call. As there is no way of knowing which Backend to ask, we loop over all the known ones
 *
 * @param {context} context Context passed by Twilio.
 * @param {event} event Event passed by Twilio.
 * @param {callback} callback Callback passed by Twilio.
 */
exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();

  const backend_host_list = JSON.parse(context.BACKEND_HOSTS);
  const identifying_attributes = JSON.parse(event.identifying_attributes);

  const identificationPromises = backend_host_list.map(backend_host =>
    identify_from_task_attributes(backend_host, identifying_attributes, context)
  );

  oneSuccess(identificationPromises)
    .then(identified => {
      response.setStatusCode(200);
      response.setBody(identified);
    })
    .catch(e => {
      console.log(e);
      response.setStatusCode(404);
      response.setBody("Could not identify the Task");
    })
    .finally(_ => callback(null, response));
};

/**
 * Pure trick to race only the successful Promises (We only care if one backend returns a PetParent!)
 */
function oneSuccess(promises) {
  return Promise.all(
    promises.map(p => {
      // If a request fails, count that as a resolution so it will keep
      // waiting for other possible successes. If a request succeeds,
      // treat it as a rejection so Promise.all immediately bails out.
      return p.then(
        val => Promise.reject(val),
        err => Promise.resolve(err)
      );
    })
  ).then(
    // If '.all' resolved, we've just got an array of errors.
    errors => Promise.reject(errors),
    // If '.all' rejected, we've got the result we wanted.
    val => Promise.resolve(val)
  );
}
