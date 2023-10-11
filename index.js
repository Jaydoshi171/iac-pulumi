"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");

const vpc = new aws.ec2.Vpc("cloud_vpc",
    cidr_block="10.0.0.0/16",
    tags={
        "Name": "cloud_vpc",
        "assignment": "4",
    });
