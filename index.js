"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");

const vpc = new aws.ec2.Vpc("cloud_vpc",{
        cidrBlock:"10.0.0.0/16",
        tags : {
            "Name": "cloud_vpc",
            "assignment": "4",
        }
    });

public_sub_ids = []
availability_zones = aws.getAvailabilityZones()
for(let i=0;i<3;i++){
    print(availability_zones.names[i])
    sub_name = "public-subnet-" + str(i)
    sub_cidr = "10.0." + str(i) + ".0/24"
    sub = aws.ec2.Subnet(sub_name,{
        vpcId : vpc.id,
        availabilityZone : availability_zones.names[i],
        cidrBlock : sub_cidr,
        tags : {
            "Name": sub_name,
            "assignment": "4",
        }
    });
    public_sub_ids.push(sub.id)
}

private_sub_ids = []
for(let i=0;i<3;i++){
    print(availability_zones.names[i])
    sub_name = "private-subnet-" + str(i)
    sub_cidr = "10.0." + str(i) + ".0/24"
    sub = aws.ec2.Subnet(sub_name,{
        vpcId : vpc.id,
        availabilityZone : availability_zones.names[i],
        cidrBlock : sub_cidr,
        tags : {
            "Name": sub_name,
            "assignment": "4",
        }
    } )
    private_sub_ids.push(sub.id)
}