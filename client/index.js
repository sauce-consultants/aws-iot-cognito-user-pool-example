const userIdToken = '';
const url = '';
const iot_endpoint = '';


const co = require('co');
const agent = require('superagent')
const signRequest = require('superagent-aws-signed-request');

const aws = require('aws-sdk');

const awsService = 'execute-api';

const fs = require('fs');
const util = require('util')
const fs_writeFile = util.promisify(fs.writeFile)



co(function* () {
  
  let httpReq = agent('GET', url + '/devices')
        .set('Authorization', userIdToken);

  let res = yield httpReq;

  if (res.status !== 200) {
    console.log(req);
    throw "API returned an error";
  }

  // to remove our admin credentials we're following this: https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-json-file.html
  let limitedCredentials = 
    { 
      "accessKeyId": res.body.AccessKeyId, 
      "secretAccessKey": res.body.SecretAccessKey, 
      "sessionToken": res.body.SessionToken,
      "region": "eu-west-2" }

  yield fs_writeFile('credentialsCache.json', JSON.stringify(limitedCredentials), 'utf8');

  aws.config.loadFromPath('credentialsCache.json');

  var iot = new aws.IotData({ endpoint: iot_endpoint });

  var result = yield iot.publish({ topic: 'demo_thing', payload: "Simple message", qos: 0}).promise();

  console.log("Success");


}).catch(function(err) {
  console.log(err);
});
