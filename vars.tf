variable "build_env" {
  default = "development"
}

variable "instance_type" {
  default = "t2.medium"
}

variable "key_name" {
  default = "amida-dev-17"
}

variable "aws_secret_key" {
  default = ""
}

variable "aws_access_key" {
  default = ""
}


variable "asg_maximum_number_of_instances" {
  default = "2"
}

variable "asg_minimum_number_of_instances" {
  default = "1"
}

variable "health_check_grace_period" {
  default = "300"
}

variable "health_check_type" {
  default = "ELB"
}

variable "availability_zones" {
  default = "us-west-2a,us-west-2b,us-west-2c"
}

variable "port" {
  default = 9005
}

variable "service_name" {
  default = "survey"
}
