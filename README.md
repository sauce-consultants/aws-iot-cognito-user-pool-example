
## Prerequsits

* Terraform (v0.11.7 was used) on the path or copied locally
* AWS-CLI installed
* AWS-CLI credentials setup in a shared file, for terraform and the admin part of the client. Can be setup manually.
* Node 8 (v8.11.2 was used)
* ClaudiaJS installed to automate the API gateway creation


## Terraform

In the terraform directory
```
terraform init
terraform plan --out plan
terraform apply "plan"
```
The output will provide settings required by the next steps

## API

In the api directory update the following constants from the terraform output:
* user_pool_arn
* iot_rule_arn
* iot_demo_thing_arn

```
claudia create --region eu-west-2 --api-module index --role <lambda_device_user_auth_rule_arn>
claudia update

```

This will provide the URL of the API which will be needed for following steps


## Create user

In the client directory update admin_create_user constants from the terraform output:
* user_pool_client_id
* user_pool_id

```
npm run-script create
```

## Test IoT interaction

```
npm test
```


## Tidy up

```
claudia destroy
terraform destroy
```
