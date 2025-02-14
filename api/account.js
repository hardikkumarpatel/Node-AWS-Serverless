
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

module.exports.update = async (event, context, callback) => {
  console.log("Received request to update account. Event is", event);
  const id = event.pathParameters.id;
  const requestBody = JSON.parse(event.body);
  const role = requestBody.role;
  const permissions = requestBody.permissions;

  if (typeof role !== 'string' || typeof permissions !== 'string') {
    console.error('Validation Failed');
    return failureResponseBuilder(400, 'Validation errors occurred.');
  }

  const params = {
    TableName: process.env.ACCOUNT_TABLE,
    Key: { id },
    UpdateExpression: 'SET #r = :role, #p = :permissions',
    ExpressionAttributeNames: {
      '#r': 'role',
      '#p': 'permissions',
    },
    ExpressionAttributeValues: {
      ':role': role,
      ':permissions': permissions,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  try {
    const result = await dynamoDb.update(params).promise();
    console.log(`Successfully updated account with id ${id}`);
    return successResponseBuilder(
      JSON.stringify({
        message: `Successfully updated account with id ${id}`,
        updatedAttributes: result.Attributes,
      })
    );
  } catch (error) {
    console.error('Failed to update account', error);
    return failureResponseBuilder(500, `Unable to update account with id ${sk_id}`);
  }
};

module.exports.delete = async (event, context, callback) => {
  console.log("Received request to delete account. Event is", event);
  const id = event.pathParameters.id;

  const params = {
    TableName: process.env.ACCOUNT_TABLE,
    Key: { id },
  };

  try {
    await dynamoDb.delete(params).promise();
    console.log(`Successfully deleted account with id ${id}`);
    return successResponseBuilder(
      JSON.stringify({
        message: `Successfully deleted account with id ${id}`,
      })
    );
  } catch (error) {
    console.error('Failed to delete account', error);
    return failureResponseBuilder(500, `Unable to delete account with id ${id}`);
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
