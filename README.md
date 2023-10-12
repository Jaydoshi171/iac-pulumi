# iac-pulumi

## About
| Name          | NUID        |
| ---           | ---         |
| Jay Doshi     | 002762973   |

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


