# iac-pulumi

# webapp

## Repositories
- Web Application: https://github.com/Jaydoshi171/webapp
- Infrastructure Code: https://github.com/Jaydoshi171/iac-pulumi 
- Serverless Code: https://github.com/Jaydoshi171/serverless

## Introduction

This project is used to create AWS architecture using Pulumi. We are creating VPC, Subnets, RouteTables, Internet gateway and associating them based on the requirements.

## Requirements

1. Create Virtual Private Cloud (VPC).
2. Create subnets in your VPC. You must create 3 public subnets and 3 private subnets, each in a different availability zone in the same region in the same VPC.
3. Create an Internet Gateway resource and attach the Internet Gateway to the VPC.
4. Create a public route table. Attach all public subnets created to the route table.
5. Create a private route table. Attach all private subnets created to the route table.
6. Create a public route in the public route table created above with the destination CIDR block 0.0.0.0/0 and the internet gateway created above as the target.

## Prerequisites
# Import SSL Certificate to AWS Certificate Manager

Follow the steps below to import your SSL certificate into AWS Certificate Manager (ACM).

## Prerequisites
1. Ensure you have the AWS CLI installed and configured with the necessary credentials.
2. Have your SSL certificate files ready:
   - Certificate file: `/Users/jaydoshi/ssl/demo_jaydoshii_me.crt`
   - Private key file: `/Users/jaydoshi/ssl/jayPrivateKey.pem`
   - Certificate chain file: `/Users/jaydoshi/ssl/demo_jaydoshii_me.ca-bundle`

## Import Certificate Command

Use the following AWS CLI command to import the SSL certificate into ACM:

aws acm import-certificate \
  --certificate fileb:///Users/jaydoshi/ssl/demo_jaydoshii_me.crt
  --private-key fileb:///Users/jaydoshi/ssl/jayPrivateKey.pem \
  --certificate-chain fileb:///Users/jaydoshi/ssl/demo_jaydoshii_me.ca-bundle

- **Pulumi CLI**: If you haven't already installed Pulumi, you can do so via Homebrew (on macOS or Linux) using the following command:

   ```sh
   brew install pulumi/tap/pulumi
   ```

   Verify your installation:

   ```sh
   pulumi version
   ```

## Deployment and Management

1. **Deploy Stack**: To deploy the aws infrastructure run the below command:

   ```sh
   pulumi up
   ```


2. **Destroy Stack (Optional)**: To delete the aws infrastructure run the below command:

   ```sh
   pulumi destroy
   ```


