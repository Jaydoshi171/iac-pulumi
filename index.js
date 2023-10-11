"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");

const vpc = new aws.ec2.Vpc("cloud_vpc",{
        cidrBlock:"10.0.0.0/16",
        tags : {
            Name: "cloud_vpc",
            assignment: "4",
        }
    });

const public_sub_ids = []
const availability_zones = aws.getAvailabilityZones()
for(let i=0;i<3;i++){
    print(availability_zones.names[i])
    const sub_name = "public-subnet-" + str(i)
    const sub_cidr = "10.0." + str(i) + ".0/24"
    const sub = new aws.ec2.Subnet(sub_name,{
        vpcId : vpc.id,
        availabilityZone : availability_zones.names[i],
        cidrBlock : sub_cidr,
        tags : {
            Name: sub_name,
            assignment: "4",
        }
    });
    public_sub_ids.push(sub.id)
}

const private_sub_ids = []
for(let i=0;i<3;i++){
    print(availability_zones.names[i])
    const sub_name = "private-subnet-" + str(i)
    const sub_cidr = "10.0." + str(i+3) + ".0/24"
    const sub = new aws.ec2.Subnet(sub_name,{
        vpcId : vpc.id,
        availabilityZone : availability_zones.names[i],
        cidrBlock : sub_cidr,
        tags : {
            Name : sub_name,
            assignment : "4",
        }
    } )
    private_sub_ids.push(sub.id)
}

const internet_gateway = new aws.ec2.InternetGateway("cloud_ig",{
    vpcId : vpc.id,
    tags : {
        Name: "cloud_ig",
        assignment : "4",
    }
});

const public_route_table = new aws.ec2.RouteTable("public-route-table",{
    vpcId : vpc.id,
    routes : [
        {
            cidrBlock : "0.0.0.0/0",
            gatewayId : internet_gateway.id,
        }
    ],
    tags : {
        Name: "public-route-table",
        assignment : "4",
    }
})

const private_route_table = new aws.ec2.RouteTable("private-route-table", {
    vpcId : vpc.id,
    tags : {
        Name : "private-route-table",
        assignment : "4",
    }
});

export const vpcId = vpc.vpcId;
