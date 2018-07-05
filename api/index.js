const user_pool_arn = '';
const iot_role_arn = '';
const iot_demo_thing_arn = '';

var iot_demo_arn_prefix = iot_demo_thing_arn.slice(0, iot_demo_thing_arn.lastIndexOf(':'));
var iot_demo_thing_name = iot_demo_thing_arn.slice(iot_demo_thing_arn.lastIndexOf('/')+1);

var aws = require('aws-sdk');
var sts = new aws.STS();

var ApiBuilder = require('claudia-api-builder'),
  api = new ApiBuilder();


api.registerAuthorizer('demo_cognito_user_pool', {
  providerARNs: [user_pool_arn]
});

api.get('/devices', async function (request) {


  /*
   * This policy statement would need to be customised for the current users devices and access level
   * For now no matter who they are they get access to device0001
   */

  var policyDocument = {};
  policyDocument.Version = '2012-10-17';
  policyDocument.Statement = [
      {
        "Effect": "Allow",
        "Action": [
          "iot:Connect"
        ],
        "Resource": [
          "*"
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "iot:UpdateThingShadow",
          "iot:GetThingShadow",
          "iot:DeleteThingShadow"
        ],
        "Resource": [
          iot_demo_thing_arn
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "iot:Publish",
          "iot:Receive"
        ],
        "Resource": [
          `${iot_demo_arn_prefix}:topic/${iot_demo_thing_name}`,
          `${iot_demo_arn_prefix}:topic/$aws/things/${iot_demo_thing_name}`,
        ]
      },
      {
        "Effect": "Allow",
        "Action": [
          "iot:Subscribe"
        ],
        "Resource": [
          `${iot_demo_arn_prefix}:topicfilter/${iot_demo_thing_name}`,
          `${iot_demo_arn_prefix}:topicfilter/$aws/things/${iot_demo_thing_name}`,
        ]
      }
  ];
  var params = {
    DurationSeconds: 3600,
    //    ExternalId: "123ABC",
    Policy: JSON.stringify(policyDocument),
    RoleArn: iot_role_arn
  };

  if (request.context.authorizer && request.context.authorizer.claims && request.context.authorizer.claims.email) {
    params.RoleSessionName = request.context.authorizer.claims.email;
  } else if (request.context.user) { // when invoking through api gateway test functions user is filled in, 
    params.RoleSessionName = request.context.user;
  }

  try
  {
    var result = await sts.assumeRole(params).promise();

    console.log(`Success for ${params.RoleSessionName}, given policy ${JSON.stringify(policyDocument.Statement)}`);
    return result.Credentials;
  }
  catch(err) {
    console.log(err);
    throw "Unable to grant permissions";
  }
}, { cognitoAuthorizer: 'demo_cognito_user_pool' });


module.exports = api;
