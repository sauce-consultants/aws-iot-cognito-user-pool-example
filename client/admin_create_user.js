'use strict';

const user_pool_client_id = '';
const user_pool_id = '';

const AWS = require('aws-sdk');
const faker = require('faker');
const co = require('co');

AWS.config.region = 'eu-west-2';
const cognito = new AWS.CognitoIdentityServiceProvider();
const cognitoIdentity = new AWS.CognitoIdentity({
    region: AWS.config.region
});

function generatePassword() {
  return faker.internet.password(12, false, "^((?=.*[a-z])|(?=.*[A-Z])|(?=.*[0-9]))", '!@£');
}

co(function* () {

  // This creates and authenticates a user using the admin API, it is not the same flow used for normal client registration/login
  let username = faker.internet.userName();
  let password = generatePassword();
  let email = faker.internet.email();

  console.log(`Creating user ${username} ${email}`);

  let createReq = {
    UserPoolId: user_pool_id,
    Username: username,
    MessageAction: 'SUPPRESS',
    TemporaryPassword: password,
    UserAttributes: [
      { Name: "email", Value: email }
    ]
  };

  yield cognito.adminCreateUser(createReq).promise();

  let req = {
    AuthFlow        : 'ADMIN_NO_SRP_AUTH',
    UserPoolId      : user_pool_id,
    ClientId        : user_pool_client_id,
    AuthParameters  : {
      USERNAME: username,
      PASSWORD: password
    }
  };

  let loginResp = yield cognito.adminInitiateAuth(req).promise();

  let newPass = generatePassword();

  let challengeReq = {
    UserPoolId: user_pool_id,
    ClientId: user_pool_client_id,
    ChallengeName: loginResp.ChallengeName,
    Session: loginResp.Session,
    ChallengeResponses: {
      USERNAME: username,
      NEW_PASSWORD: newPass
    }
  };

  let challengeResp = yield cognito.adminRespondToAuthChallenge(challengeReq).promise();

  console.log(`Auth completed: ${username} ${email}`);
  console.log(`IdToken: ${challengeResp.AuthenticationResult.IdToken}`);
  console.log(`Expires: ${challengeResp.AuthenticationResult.ExpiresIn}`);

  return {
    username,
    email,
    idToken: challengeResp.AuthenticationResult.IdToken,
    expires: challengeResp.AuthenticationResult.ExpiresIn
  };
}).catch(function (err) {
  console.log(err);
});

