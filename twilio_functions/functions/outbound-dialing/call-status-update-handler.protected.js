/*
 Function for receiving call status updates and pushing them into
 a sync document monitored by the worker.  This allows the front end
 to recognize when the call is queued, ringing, answered and for
 the front end to receive the task.
 NOT QUITE SURE ABOUT THIS
 */

const updateSyncDoc = (context, event) => {
  const client = context.getTwilioClient();
  const syncService = client.sync.services(context.syncServiceSid );

  return new Promise(function (resolve, reject) {
    syncService.documents(event.workerSyncDoc)
      .update({
        data: {
          autoDial: false,
          call: {
            callSid: event.CallSid,
            callStatus: event.CallStatus
          }
        }
      })
      .then(() => resolve())
      .catch(error => {
        console.log("ERROR updating sync map: ", error);
        resolve();
      })
  })
}

exports.handler = async function (context, event, callback) {

  console.log("callback for: ", event.CallSid);
  console.log("status: ", event.CallStatus);
  console.log("workerSyncDoc: ", event.workerSyncDoc);
  console.log("workerSid: ", event.workerSid);

  const response = new Twilio.Response();

  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS POST');
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  // We dont need to know about calls that are completed as this is the natural part of the life cycle after the call has been answered
  if (event.CallStatus !== "completed") {
    updateSyncDoc(context, event).then(() => callback(null, response))
  } else {
    callback(null, response)
  }

};