
'use strict';
const uuid = require('uuid');
const AWS = require('aws-sdk');

AWS.config.setPromisesDependency(require('bluebird'));
const dynamoDb = new AWS.DynamoDB.DocumentClient();

module.exports.create = async (event, context, callback) => {
  console.log("Receieved request submit account details, Event is", event);
  const requestBody = JSON.parse(event.body);
  const sk_id = requestBody.sk_id;
  const role = requestBody.role;
  const permissions = requestBody.permissions;

  if (typeof sk_id !== 'string' || typeof role !== 'string' || typeof permissions !== 'string') {
    console.error('Validation Failed');
    return failureResponseBuilder(400, 'Validation errors occurred.');
  }

  const account = accountInfo(sk_id, role, permissions);
  console.log('accountCreation() Submitting account to system');
  const accountItem = {
    TableName: process.env.ACCOUNT_TABLE,
    Item: account,
  };

  try {
    await dynamoDb.put(accountItem).promise();
    console.log(`Successfully submitted ${sk_id} account to system`);
    return successResponseBuilder(
      JSON.stringify({
        message: `Successfully submitted account with sk_id ${sk_id}`,
        accountId: account.id,
      })
    );
  } catch (error) {
    console.error('Failed to submit account to system', error);
    return failureResponseBuilder(409, `Unable to submit account with sk_id ${sk_id}`);
  }
};

module.exports.list = async (event, context, callback) => {
  console.log("Receieved request to list all accounts. Event is", event);
  const params = {
    TableName: process.env.ACCOUNT_TABLE,
  };

  try {
    const result = await dynamoDb.scan(params).promise();
    console.log("Scan succeeded.");
    return successResponseBuilder(JSON.stringify({
      statusCode: 200,
      body: result.Items
    }));
  } catch (error) {
    console.log('Scan failed to load data. Error JSON:', JSON.stringify(error, null, 2));
    return failureResponseBuilder(500, 'Failed to load accounts');
  }
};



const accountInfo = (sk_id, role, permissions) => {
  const timestamp = new Date().getTime();
  return {
    id: uuid.v4(),
    sk_id,
    role,
    permissions,
    submittedAt: timestamp,
    updatedAt: timestamp,
  };
};

const successResponseBuilder = (body) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: body
  };
};

const failureResponseBuilder = (statusCode, body) => {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: body
  };
};
