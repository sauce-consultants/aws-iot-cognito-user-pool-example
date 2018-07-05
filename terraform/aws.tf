
provider "aws" {
  region = "eu-west-2"
  version = "~> 1.21"
}

resource "aws_cognito_user_pool" "user_pool" {
  name = "demo-tf-pool"

  // bug in terraform means we need to specify all props with schema to avoid it being recreated each time
  schema {
    attribute_data_type = "String"
    developer_only_attribute = false
    mutable = false
    name = "email"
    required = true

    string_attribute_constraints {
      min_length = 4
      max_length = 256
    }
  }
}

resource "aws_cognito_user_pool_client" "pool_client" {
  name = "app_client"

  user_pool_id = "${aws_cognito_user_pool.user_pool.id}"

  generate_secret = false
  explicit_auth_flows = ["ADMIN_NO_SRP_AUTH"]
}

output user_pool_id {
  value = "${aws_cognito_user_pool.user_pool.id}"
}

output user_pool_client_id {
  value = "${aws_cognito_user_pool_client.pool_client.id}"
}

output user_pool_endpoint {
  value = "${aws_cognito_user_pool.user_pool.endpoint}"
}

output user_pool_arn {
  value = "${aws_cognito_user_pool.user_pool.arn}"
}


/* Create the IoT resource we're interested in giving access to */
resource "aws_iot_thing" "demo_thing" {
  name = "demo_thing"
}

data "aws_iot_endpoint" "endpoint" {}

output iot_demo_thing_arn {
  value = "${aws_iot_thing.demo_thing.arn}"
}

output iot_demo_endpoint{
  value = "${data.aws_iot_endpoint.endpoint.endpoint_address}"
}

/*
 * From here we define the policies we'll need
 */

// lambda function runs under this role
resource "aws_iam_role" "lambda_user_device_auth_role" {
  name = "lambda_user_device_auth"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

// the API lambda function runs under this policy, it can the IoT role and allows logging
resource "aws_iam_role_policy" "grant_iot_access" {
  name = "logging_and_delegate_access"
  role = "${aws_iam_role.lambda_user_device_auth_role.id}"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "sts:AssumeRole",
    "Resource": "${aws_iam_role.iot_user_role.arn}"
  },
  {
      "Effect": "Allow",
      "Action": [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
  }]
}
EOF
}

// Policy that will be used by our device/user authorisation lambda function to give access to specific devices
resource "aws_iam_role" "iot_user_role" {
  name = "iot_user_role"

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "${aws_iam_role.lambda_user_device_auth_role.arn}"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
}

// This role is part of the role that will be assumed and given to the user. It is quite wide, the function will specify a subset
resource "aws_iam_role_policy" "iot_grant_all" {
  name = "iot_access"
  role = "${aws_iam_role.iot_user_role.id}"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "iot:*"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
EOF
}

output iot_rule_arn {
  value = "${aws_iam_role.iot_user_role.arn}"
}

output lambda_device_user_auth_rule_arn {
  value = "${aws_iam_role.lambda_user_device_auth_role.arn}"
}
