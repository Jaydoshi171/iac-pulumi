"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");
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
    let no_of_zones =  3;
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
        } )
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

    const security_grp = new aws.ec2.SecurityGroup(config.require("SECURITY_GROUP_NAME"), {
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
        },{
            fromPort: config.require("SSH_PORT"),
            toPort: config.require("SSH_PORT"),
            protocol: config.require("PROTOCOL"),
            cidrBlocks: [config.require("ROUTE_TO_INTERNET")],
            ipv6CidrBlocks: [config.require("ROUTE_TO_INTERNET_IPV6")],
        },{
            fromPort: config.require("APPLICATION_PORT"),
            toPort: config.require("APPLICATION_PORT"),
            protocol: config.require("PROTOCOL"),
            cidrBlocks: [config.require("ROUTE_TO_INTERNET")],
        }],
        tags: {
            Name: config.require("SECURITY_GROUP_NAME"),
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
    const instance = new aws.ec2.Instance(config.require("EC2_INSTANCE_NAME"), {
        ami: ami.then(i => i.id),
        instanceType: config.require("EC2_INSTANCE_TYPE"),
        subnetId: public_sub_ids[0],
        keyName: config.require("KEY_PAIR_NAME"),
        associatePublicIpAddress: true,
        vpcSecurityGroupIds: [
            security_grp.id,
        ],
        tags: {
            Name: config.require("EC2_INSTANCE_NAME"),
        },
        userData:`
        #!/bin/bash
        cd /home/admin
        sudo chmod -R 774 opt
        cd opt
        npm start
    `,
    });
});
