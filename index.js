"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");
const gcp = require("@pulumi/gcp");
const config = new pulumi.Config();
const vpc_name = config.require("VPC_NAME");
const vpc_cidr = config.require("VPC_CIDR");
const no_of_max_subnets = config.require("NO_OF_MAX_SUBNETS");
const private_subnet_name = config.require("PRIAVTE_SUBNET_NAME");
const public_subnet_name = config.require("PUBLIC_SUBNET_NAME");
const sub_cidr = config.require("SUB_CIDR");
const internet_gateway_name = config.require("INTERNET_GATEWAY_NAME");
const private_route_table_name = config.require("PRIVATE_ROUTE_TABLE_NAME");
const public_route_table_name = config.require("PUBLIC_ROUTE_TABLE_NAME");
const route_to_internet = config.require("ROUTE_TO_INTERNET");
const private_association_name = config.require("PRIVATE_ASSOCIATION_NAME");
const public_association_name = config.require("PUBLIC_ASSOCIATION_NAME");
const availability_zones = aws.getAvailabilityZones({state: "available"});

const vpc = new aws.ec2.Vpc(vpc_name,{
    cidrBlock:vpc_cidr,
    tags : {
        Name: vpc_name,
    }
});

availability_zones.then(available_zones => {

    let no_of_avail_zones = available_zones.names?.length;
    let no_of_zones =  parseInt(no_of_max_subnets);
    const public_sub_ids = []
    const private_sub_ids = []
    if(parseInt(no_of_avail_zones)<no_of_max_subnets){
        no_of_zones = parseInt(no_of_avail_zones);
    }

    const sub_cidr_arr = sub_cidr.split(".");
    for(let i=0;i<no_of_zones;i++){
        const sub_name = public_subnet_name + i;
        const sub_cidr_val = sub_cidr_arr[0] + "." + sub_cidr_arr[1] + "." + i + "." + sub_cidr_arr[3];
        const sub = new aws.ec2.Subnet(sub_name,{
            vpcId : vpc.id,
            availabilityZone : availability_zones.then(available => available.names?.[i]),
            cidrBlock : sub_cidr_val,
            tags : {
                Name: sub_name,
            }
        });
        public_sub_ids.push(sub.id)
    }

    for(let i=0;i<no_of_zones;i++){
        const sub_name = private_subnet_name + i;
        const host_id = i + no_of_zones;
        const sub_cidr_val = sub_cidr_arr[0] + "." + sub_cidr_arr[1] + "." + host_id + "." + sub_cidr_arr[3];
        const sub = new aws.ec2.Subnet(sub_name,{
            vpcId : vpc.id,
            availabilityZone : availability_zones.then(available => available.names?.[i]),
            cidrBlock : sub_cidr_val,
            tags : {
                Name : sub_name,
            }
        })
        private_sub_ids.push(sub.id)
    }

    const internet_gateway = new aws.ec2.InternetGateway(internet_gateway_name,{
        vpcId : vpc.id,
        tags : {
            Name: internet_gateway_name,
        }
    });

    const public_route_table = new aws.ec2.RouteTable(public_route_table_name,{
        vpcId : vpc.id,
        routes : [
            {
                cidrBlock : route_to_internet,
                gatewayId : internet_gateway.id,
            }
        ],
        tags : {
            Name: public_route_table_name,
        }
    })

    const private_route_table = new aws.ec2.RouteTable(private_route_table_name, {
        vpcId : vpc.id,
        tags : {
            Name : private_route_table_name,
        }
    });

    for(let i=0;i<no_of_zones;i++){
        const association_name = public_association_name + i;
        const route_table_association = new aws.ec2.RouteTableAssociation(association_name,{
            subnetId : public_sub_ids[i],
            routeTableId : public_route_table.id
        })
    }
        

    for(let i=0;i<no_of_zones;i++){
        const association_name = private_association_name + i;
        const route_table_association = new aws.ec2.RouteTableAssociation(association_name,{
            subnetId : private_sub_ids[i],
            routeTableId : private_route_table.id
        })
    }

    const load_bal_sec_grp = new aws.ec2.SecurityGroup(config.require("LOAD_BALANCER_SECURITY_GROUP"), {
        vpcId: vpc.id,
        ingress: [{
            fromPort: config.require("HTTPS_PORT"),
            toPort: config.require("HTTPS_PORT"),
            protocol: config.require("PROTOCOL"),
            cidrBlocks: [config.require("ROUTE_TO_INTERNET")],
            ipv6CidrBlocks: [config.require("ROUTE_TO_INTERNET_IPV6")],
        },{
            fromPort: config.require("HTTP_PORT"),
            toPort: config.require("HTTP_PORT"),
            protocol: config.require("PROTOCOL"),
            cidrBlocks: [config.require("ROUTE_TO_INTERNET")],
            ipv6CidrBlocks: [config.require("ROUTE_TO_INTERNET_IPV6")],
        }],
        egress: [
            {
                protocol: config.require("EGRESS_PROTOCOL"),
                fromPort: config.require("EGRESS_PORT"),
                toPort: config.require("EGRESS_PORT"),
                // security_groups: [security_grp_id],
                cidrBlocks: [config.require("ROUTE_TO_INTERNET")],
            },
        ],
        tags: {
            Name: "cloud-load-balancer",
        },
    });

    const security_grp = new aws.ec2.SecurityGroup(config.require("SECURITY_GROUP_NAME"), {
        vpcId: vpc.id,
        ingress: [{
            fromPort: config.require("SSH_PORT"),
            toPort: config.require("SSH_PORT"),
            protocol: config.require("PROTOCOL"),
            cidrBlocks: [config.require("ROUTE_TO_INTERNET")],
            ipv6CidrBlocks: [config.require("ROUTE_TO_INTERNET_IPV6")],
        },{
            fromPort: config.require("APPLICATION_PORT"),
            toPort: config.require("APPLICATION_PORT"),
            protocol: config.require("PROTOCOL"),
            security_groups: [load_bal_sec_grp.id],
        }],
        egress: [
            {
                protocol: config.require("PROTOCOL"),
                fromPort: config.require("DATABASE_PORT"),
                toPort: config.require("DATABASE_PORT"),
                cidrBlocks: [config.require("ROUTE_TO_INTERNET")],
            },
            {
                protocol: config.require("EGRESS_PROTOCOL"),
                fromPort: config.require("EGRESS_PORT"),
                toPort: config.require("EGRESS_PORT"),
                cidrBlocks: [config.require("ROUTE_TO_INTERNET")],
            },
        ],
        tags: {
            Name: config.require("SECURITY_GROUP_NAME"),
        },
    });

    const db_security_grp = new aws.ec2.SecurityGroup(config.require("DATABASE_SECURITY_GROUP_NAME"), {
        vpcId: vpc.id,
        ingress: [{
            fromPort: config.require("DATABASE_PORT"),
            toPort: config.require("DATABASE_PORT"),
            protocol: config.require("PROTOCOL"),
            securityGroups: [security_grp.id]
        }],
        egress: [
            {
                protocol: config.require("EGRESS_PROTOCOL"),
                fromPort: config.require("EGRESS_PORT"),
                toPort: config.require("EGRESS_PORT"),
                security_groups: [security_grp.id],
                cidrBlocks: [config.require("ROUTE_TO_INTERNET")],
            },
        ],
        tags: {
            Name: config.require("DATABASE_SECURITY_GROUP_NAME"),
        },
    });


    const rds_param_name = new aws.rds.ParameterGroup(config.require("RDS_PARAMETER_NAME"), {
        family: config.require("RDS_FAMILY"),
        vpcId: vpc.id,
        parameters: [{
            name: config.require("PARAMETER_KEY"),
            value: config.require("PARAMETER_VALUE")
        }]
    });

    const privateSubnetID = private_sub_ids.map(subnet => subnet);
    const rds_private_subnet = new aws.rds.SubnetGroup(config.require("SUBNET_GROUP_NAME"), {
        subnetIds: privateSubnetID,
        tags: {
            Name: config.require("SUBNET_GROUP_NAME"),
        },
    });

    const application_rds_instance = new aws.rds.Instance(config.require("RDS_INSTANCE_NAME"), {
        allocatedStorage: config.require("RDS_ALLOCATED_STORAGE"),
        storageType: config.require("RDS_STORAGE_TYPE"),
        engine: config.require("DATABASE_DIALECT"),
        engineVersion: config.require("RDS_ENGINE_VERSION"),
        skipFinalSnapshot: config.require("RDS_SKIP_FINAL_SNAPSHOT"),
        instanceClass: config.require("RDS_INSTANCE_CLASS"),
        multiAz: config.require("RDS_MULTI_AZ"),
        dbName: config.require("DATABASE_NAME"),
        username: config.require("DATABASE_USER"),
        password: config.require("DATABASE_PASSWORD"),
        parameterGroupName: rds_param_name.name,
        dbSubnetGroupName: rds_private_subnet,
        vpcSecurityGroupIds: [db_security_grp.id],
        publiclyAccessible: config.require("RDS_MULTI_AZ"),
        tags: {
            Name:config.require("RDS_INSTANCE_NAME"),
        },
    });

    const ami = aws.ec2.getAmi({
        filters: [
            {
                name: config.require("AMI_FILTER_KEY_1"),
                values: [config.require("AMI_FILTER_VALUE_1")],
            },
        ],
        mostRecent: true,
        owners: [config.require("AMI_OWNER")],
    });
    ami.then(i => console.log(i.id))
    application_rds_instance.endpoint.apply(endpoint => {
            
        const rds_endpoint = endpoint.split(":")[0]
        console.log(rds_endpoint);

        const gcp_bucket = new gcp.storage.Bucket("assignment_submission", {
            forceDestroy: true,
            location: config.require("GCP_LOCATION"),
            project: config.require("GCP_PROJECT"),
        });
        
        const serviceAccount = new gcp.serviceaccount.Account("storageuser", {
            accountId: config.require("GCP_SERVICE_ACCOUNT_ID"),
            project: config.require("GCP_PROJECT"),
        });
        
        const storageObjectUserRole = "roles/storage.objectUser";
        
        const binding = new gcp.projects.IAMBinding("storage-object-binding", {
            project: config.require("GCP_PROJECT"),
            members: [serviceAccount.email.apply(email => `serviceAccount:${email}`)],
            role: storageObjectUserRole,
        });
        
        const serviceAccountKey = new gcp.serviceaccount.Key("my-service-account-key", {
            serviceAccountId: serviceAccount.name,
        });

        const ec2_role = new aws.iam.Role(config.require("CLOUD_WATCH_ROLE"), {
            assumeRolePolicy: JSON.stringify({
                Version: config.require("ROLE_VERSION"),
                Statement: [{
                    Action: config.require("ROLE_ACTION"),
                    Effect: config.require("ROLE_EFFECT"),
                    Sid: "",
                    Principal: {
                        Service: config.require("ROLE_SERVICE"),
                    },
                }],
            }),
            tags: {
                Name: config.require("CLOUD_WATCH_ROLE"),
            },
        });
        
        const policy = new aws.iam.PolicyAttachment(config.require("POLICY_ATTACHMENT"), {
            policyArn: config.require("POLICY_ARN"),
            roles: [ec2_role.name],
        });
        
        const policy_sns = new aws.iam.PolicyAttachment("sns_policy_attachment", {
            policyArn: config.require("SNS_POLICY"),
            roles: [ec2_role.name],
        });
        
        const roleAttachment = new aws.iam.InstanceProfile(config.require("INSTANCE_PROFILE_NAME"), {
            role: ec2_role.name,
        });
        
        const sns_topic = new aws.sns.Topic("submit-assignment", {
            displayName: "submit-assignment",
        })
        
        const iamLambdaRole = new aws.iam.Role('iamLambdaRole', {
            assumeRolePolicy: aws.iam.getPolicyDocument(
                {statements: [
                    {effect: "Allow",
                    principals: [
                        {
                            type: "Service",
                            identifiers: ["lambda.amazonaws.com"],
                        }
                    ],
                    actions: ["sts:AssumeRole"]}
                ]}
            ).then((assumeRole) => assumeRole.json),
        });
        
        const iamLambdaRolePolicyAttachment = new aws.iam.RolePolicyAttachment('CloudWatchPolicyAttachment', {
            role: iamLambdaRole.name,
            policyArn: config.require("CLOUD_WATCH_POLICY"),
        }); 
        
        const iamDBRolePolicyAttachment = new aws.iam.RolePolicyAttachment('DynamoDbPolicyAttachment', {
            role: iamLambdaRole.name,
            policyArn: config.require("DYNAMODB_POLICY"),
        });
        
        
        let messagesTable = new aws.dynamodb.Table("trackMail", {
            attributes: [
                { name: "message_id", type: "S" },
            ],
            hashKey: "message_id",
            billingMode: "PAY_PER_REQUEST",
            tags: {
                Name: "trackMail",
            },
        });
        
        const testLambda = new aws.lambda.Function("store-assignment", {
            code: config.require("SERVERLESS_PATH"),
            role: iamLambdaRole.arn,
            handler: "index.handler",
            runtime: "nodejs18.x",
            environment: {
                variables: {
                    BUCKET_NAME: gcp_bucket.name,
                    PRIVATE_KEY: serviceAccountKey.privateKey.apply(encoded => Buffer.from(encoded, 'base64').toString('ascii')),
                    DNS_NAME: config.require("DNS_DOMAIN_NAME"),
                    SENDER_EMAIL: config.require("SENDER_EMAIL"),
                    MAILGUN_API_KEY: config.require("MAIL_GUN_API_KEY"),
                    DYNAMODB_TABLE_NAME: messagesTable.name.apply(name => {return name})
                },
            },
            tags: {
                Name: "store-assignment",
            },
        });
        
        const lambdaPermission = new aws.lambda.Permission("myLambdaPermission", {
            action: "lambda:InvokeFunction",
            function: testLambda.arn,
            principal: "sns.amazonaws.com",
            sourceArn: sns_topic.arn,
        });
        
        const topicSubscription = new aws.sns.TopicSubscription("myTopicSubscription", {
            endpoint: testLambda.arn,
            protocol: "lambda",
            topic: sns_topic.arn,
        });

        sns_topic.arn.apply(sns_topic_arn => {
            const userData = `#!/bin/bash
            echo "port=${config.require("APPLICATION_PORT")}" >> ${config.require("APPLICATION_ENV_LOCATION")}
            echo "host=${rds_endpoint}" >> ${config.require("APPLICATION_ENV_LOCATION")}
            echo "dialect=${config.require("DATABASE_DIALECT")}" >> ${config.require("APPLICATION_ENV_LOCATION")}
            echo "user=${config.require("DATABASE_USER")}" >> ${config.require("APPLICATION_ENV_LOCATION")}
            echo "password=${config.require("DATABASE_PASSWORD")}" >> ${config.require("APPLICATION_ENV_LOCATION")}
            echo "database=${config.require("DATABASE_NAME")}" >> ${config.require("APPLICATION_ENV_LOCATION")}
            echo "aws_region=us-east-1" >> ${config.require("APPLICATION_ENV_LOCATION")}
            echo "sns_topic_arn=${sns_topic_arn}" >> ${config.require("APPLICATION_ENV_LOCATION")}
            sudo systemctl restart amazon-cloudwatch-agent
            `
        
            const ec2_launch_Template = new aws.ec2.LaunchTemplate( config.require("LAUNCH_TEMPLATE_NAME"), {
                blockDeviceMappings: [{
                    deviceName: config.require("EC2_DEVICE_NAME"),
                    ebs: {
                        volumeSize: config.require("EC2_VOLUME_SIZE"),
                        deleteOnTermination: config.require("EC2_DELETE_ON_TERMINATION"),
                        volumeType: config.require("EC2_VOLUME_TYPE")
                    },
                }],
                instanceType: config.require("EC2_INSTANCE_TYPE"),
                keyName: config.require("KEY_PAIR_NAME"),
                iamInstanceProfile: {name: roleAttachment.name},
                imageId: ami.then(i => i.id),
                networkInterfaces: [{
                    associatePublicIpAddress: "true",
                    securityGroups: [security_grp.id],
                }],
                namePrefix:  config.require("LAUNCH_TEMPLATE_NAME_PREFIX"),
                userData: Buffer.from(userData).toString('base64'),
            })
        
            const targetGroup = new aws.lb.TargetGroup(config.require("TARGET_GROUP_NAME"), {
                port: config.require("TARGET_GROUP_PORT"),
                protocol: config.require("TARGET_GROUP_PROTOCOL"),
                targetType: config.require("TARGET_GROUP_TYPE"),
                vpcId: vpc.id,
                healthCheck: {
                    path: "/healthz", 
                    interval: 30, 
                    timeout: 10, 
                    healthyThreshold: 3, 
                    unhealthyThreshold: 2, 
                    matcher: "200",
                },
            });
        
            const ec2_asg = new aws.autoscaling.Group(config.require("AUTO_SCALING_GROUP_NAME"), {
                vpcZoneIdentifiers: public_sub_ids,
                desiredCapacity: config.require("AUTO_SCALING_GROUP_DESIRED_CAPACITY"),
                minSize: config.require("AUTO_SCALING_GROUP_MINSIZE"),
                maxSize: config.require("AUTO_SCALING_GROUP_MAXSIZE"),
                targetGroupArns: [targetGroup.arn],
                launchTemplate: {
                    id: ec2_launch_Template.id,
                },
                tags: [
                    {
                        key: "Name",
                        value: config.require("AUTO_SCALING_GROUP_NAME"),
                        propagateAtLaunch: false,
                    },
                    {
                        key: config.require("ASG_TAG_KEY"),
                        value: config.require("ASG_TAG_VALUE"),
                        propagateAtLaunch: true,
                    },
                ],
            });
        
            const scaleUpPolicy = new aws.autoscaling.Policy(config.require("AUTO_SCALING_POLICY_UP_NAME"), {
                adjustmentType: config.require("AUTO_SCALING_POLICY_ADJUSTMENT_TYPE"),
                scalingAdjustment: config.require("AUTO_SCALING_POLICY_SCALING_UP_ADJUSTMENT"),
                cooldown: config.require("AUTO_SCALING_POLICY_COOLDOWN"),
                policyType: config.require("AUTO_SCALING_POLICY_POLICY_TYPE"),
                autoscalingGroupName: ec2_asg.name,
            });
        
            const scaleUpCondition = new aws.cloudwatch.MetricAlarm(config.require("AUTO_SCALING_POLICY_ALARM_UP_NAME"), {
                metricName: config.require("AUTO_SCALING_POLICY_METRICS_NAME"),
                namespace: config.require("AUTO_SCALING_POLICY_NAMESPACE"),
                statistic: config.require("AUTO_SCALING_POLICY_STATISTICS"),
                period: config.require("AUTO_SCALING_POLICY_PERIOD"),
                evaluationPeriods: config.require("AUTO_SCALING_POLICY_EVALUATION_PERIODS"),
                comparisonOperator: config.require("AUTO_SCALING_POLICY_COMPARISON_OPERATOR_UP"),
                threshold: config.require("AUTO_SCALING_POLICY_THRESHOLD_UP"),
                dimensions: {
                    AutoScalingGroupName: ec2_asg.name,
                },
                alarmActions: [scaleUpPolicy.arn],
            });
        
            const scaleDownPolicy = new aws.autoscaling.Policy(config.require("AUTO_SCALING_POLICY_DOWN_NAME"), {
                adjustmentType: config.require("AUTO_SCALING_POLICY_ADJUSTMENT_TYPE"),
                scalingAdjustment: config.require("AUTO_SCALING_POLICY_SCALING_DOWN_ADJUSTMENT"),
                cooldown: config.require("AUTO_SCALING_POLICY_COOLDOWN"),
                policyType: config.require("AUTO_SCALING_POLICY_POLICY_TYPE"),
                autoscalingGroupName: ec2_asg.name,
            });
        
            const scaleDownCondition = new aws.cloudwatch.MetricAlarm(config.require("AUTO_SCALING_POLICY_ALARM_DOWN_NAME"), {
                metricName: config.require("AUTO_SCALING_POLICY_METRICS_NAME"),
                namespace: config.require("AUTO_SCALING_POLICY_NAMESPACE"),
                statistic: config.require("AUTO_SCALING_POLICY_STATISTICS"),
                period: config.require("AUTO_SCALING_POLICY_PERIOD"),
                evaluationPeriods: config.require("AUTO_SCALING_POLICY_EVALUATION_PERIODS"),
                comparisonOperator: config.require("AUTO_SCALING_POLICY_COMPARISON_OPERATOR_DOWN"),
                threshold:config.require("AUTO_SCALING_POLICY_THRESHOLD_DOWN"),
                dimensions: {
                    AutoScalingGroupName: ec2_asg.name,
                },
                alarmActions: [scaleDownPolicy.arn],
            });
        
            const alb = new aws.lb.LoadBalancer(config.require("LOAD_BALANCER_NAME"), {
                loadBalancerType: config.require("LOAD_BALANCER_TYPE"),
                securityGroups: [load_bal_sec_grp.id],
                subnets: public_sub_ids,
            });
                
            const listener = new aws.lb.Listener(config.require("LISTENER_NAME"), {
                loadBalancerArn: alb.arn,
                port: config.require("LISTENER_PORT"),
                protocol: config.require("LISTENER_PROTOCOL"),
                defaultActions: [{
                    type: config.require("LISTENER_ACTION_TYPE"),
                    targetGroupArn: targetGroup.arn,
                }],
            });
        
            const dns_zone = aws.route53.getZone({
                name: config.require("DNS_NAME"),
            });
        
            const route53_record = new aws.route53.Record(config.require("ROUTE_53_RECORD_NAME"), {
                zoneId: dns_zone.then(selected => selected.zoneId),
                name: config.require("DNS_NAME"),
                type: config.require("RECORD_TYPE"),
                aliases: [{
                    name: alb.dnsName,
                    zoneId: alb.zoneId,
                    evaluateTargetHealth: true
                }],
            });
        });
    });
});
