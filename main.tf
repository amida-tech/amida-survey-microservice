provider "aws" {
  access_key = "${var.aws_access_key}"
  secret_key = "${var.aws_secret_key}"
  region     = "${var.aws_region}"
}

data "aws_ami" "api" {
  most_recent = true

  filter {
    name   = "name"
    values = ["api-${var.service_name}-service-boilerplate-${var.build_env}*"]
  }

  owners = ["844297601570"]
}

resource "aws_launch_configuration" "launch_config" {
  image_id        = "${data.aws_ami.api.id}"
  instance_type   = "${var.instance_type}"
  key_name        = "${var.key_name}"
  security_groups = ["${aws_security_group.api_sg.id}"]
  iam_instance_profile = "${aws_iam_instance_profile.app-ec2-role.name}"

  root_block_device {
    delete_on_termination = true
    volume_type           = "gp2"
    volume_size           = 64
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group" "api_sg" {
  name        = "api-${var.service_name}-service-boilerplate-security-group"
  description = "SG for API boilerplate deployment"

  ingress {
    from_port   = 0
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 0
    to_port     = "${var.port}"
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 0
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 0
    to_port     = 81
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 0
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port = 0
    to_port   = 0
    protocol  = "tcp"
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_autoscaling_group" "main_asg" {
  # interpolate the LC into the ASG name so it always forces an update
  name = "api-${var.service_name}-service-${var.build_env}-asg-${data.aws_ami.api.id}"

  # We want this to explicitly depend on the launch config above
  depends_on = ["aws_launch_configuration.launch_config"]

  # The chosen availability zones *must* match the AZs the VPC subnets are tied to.
  availability_zones = ["${split(",", var.availability_zones)}"]

  # Uses the ID from the launch config created above
  launch_configuration = "${aws_launch_configuration.launch_config.id}"

  max_size = "${var.asg_maximum_number_of_instances}"
  min_size = "${var.asg_minimum_number_of_instances}"

  health_check_grace_period = "${var.health_check_grace_period}"
  health_check_type         = "${var.health_check_type}"

  load_balancers = ["${aws_elb.api_lb.name}"]

  wait_for_elb_capacity = "${var.asg_minimum_number_of_instances}"

  tag {
    key                 = "environment"
    value               = "${var.build_env}"
    propagate_at_launch = true
  }

  tag {
    key                 = "Name"
    value               = "api-${var.service_name}-service-${var.build_env}"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_elb" "api_lb" {
  name               = "api-${var.service_name}-service-lb"
  availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]
  security_groups    = ["${aws_security_group.api_sg.id}"]

  listener {
    instance_port     = "${var.port}"
    instance_protocol = "http"
    lb_port           = 80
    lb_protocol       = "http"
  }

  # listener {
  #   instance_port      = 81
  #   instance_protocol  = "http"
  #   lb_port            = 443
  #   lb_protocol        = "https"
  #   ssl_certificate_id = "arn:aws:iam::123456789012:server-certificate/certName"
  # }

  health_check {
    healthy_threshold   = 4
    unhealthy_threshold = 2
    timeout             = 10
    target              = "HTTP:80/api/health-check"
    interval            = 15
  }

  cross_zone_load_balancing = true
  idle_timeout              = 60
}

resource "aws_autoscaling_policy" "scale_up" {
  name                   = "${aws_autoscaling_group.main_asg.name}-scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = "${aws_autoscaling_group.main_asg.name}"
}

resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "${aws_autoscaling_group.main_asg.name}-cpu-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"

  dimensions {
    AutoScalingGroupName = "${aws_autoscaling_group.main_asg.name}"
  }

  alarm_description = "This metric monitors high ec2 cpu utilization"
  alarm_actions     = ["${aws_autoscaling_policy.scale_up.arn}", "arn:aws:sns:us-west-2:844297601570:ops_team_alerts"]
}

resource "aws_cloudwatch_metric_alarm" "cpu_very_high" {
  alarm_name          = "${aws_autoscaling_group.main_asg.name}-cpu-very-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "120"
  statistic           = "Average"
  threshold           = "90"

  dimensions {
    AutoScalingGroupName = "${aws_autoscaling_group.main_asg.name}"
  }

  alarm_description = "This metric monitors very high ec2 cpu utilization"
  alarm_actions     = ["${aws_autoscaling_policy.scale_up.arn}", "arn:aws:sns:us-west-2:844297601570:ops_team_alerts"]
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "${aws_autoscaling_group.main_asg.name}-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown               = 300
  autoscaling_group_name = "${aws_autoscaling_group.main_asg.name}"
}

resource "aws_cloudwatch_metric_alarm" "cpu_low" {
  alarm_name          = "${aws_autoscaling_group.main_asg.name}-cpu-low"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "120"
  statistic           = "Average"
  threshold           = "25"

  dimensions {
    AutoScalingGroupName = "${aws_autoscaling_group.main_asg.name}"
  }

  alarm_description = "This metric monitors low ec2 cpu utilization"
  alarm_actions     = ["${aws_autoscaling_policy.scale_down.arn}", "arn:aws:sns:us-west-2:844297601570:ops_team_alerts"]
}

resource "aws_cloudwatch_metric_alarm" "disk_low" {
  alarm_name          = "${aws_autoscaling_group.main_asg.name}-disk-low"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "DiskSpaceUtilization"
  namespace           = "System/Linux"
  period              = "120"
  statistic           = "Average"
  threshold           = "10"

  dimensions {
    AutoScalingGroupName = "${aws_autoscaling_group.main_asg.name}"
    Filesystem = "/dev/xvda1"
    MountPath = "/"
  }

  alarm_description = "This metric monitors low disk space utilization"
  alarm_actions     = ["arn:aws:sns:us-west-2:844297601570:ops_team_alerts"]
}

resource "aws_cloudwatch_metric_alarm" "disk_high" {
  alarm_name          = "${aws_autoscaling_group.main_asg.name}-disk-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "DiskSpaceUtilization"
  namespace           = "System/Linux"
  period              = "120"
  statistic           = "Average"
  threshold           = "80"

  dimensions {
    AutoScalingGroupName = "${aws_autoscaling_group.main_asg.name}"
    Filesystem = "/dev/xvda1"
    MountPath = "/"
  }

  alarm_description = "This metric monitors high disk space utilization"
  alarm_actions     = ["arn:aws:sns:us-west-2:844297601570:ops_team_alerts"]
}

resource "aws_cloudwatch_metric_alarm" "disk_very_high" {
  alarm_name          = "${aws_autoscaling_group.main_asg.name}-disk-very-high"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = "2"
  metric_name         = "DiskSpaceUtilization"
  namespace           = "System/Linux"
  period              = "120"
  statistic           = "Average"
  threshold           = "90"

  dimensions {
    AutoScalingGroupName = "${aws_autoscaling_group.main_asg.name}"
    Filesystem = "/dev/xvda1"
    MountPath = "/"
  }

  alarm_description = "This metric monitors high disk space utilization"
  alarm_actions     = ["arn:aws:sns:us-west-2:844297601570:ops_team_alerts"]
}

resource "aws_cloudwatch_metric_alarm" "surge-que-length-high" {
  alarm_name  = "${aws_elb.api_lb.name}-surge-que-length-high"
  namespace   = "AWS/ELB"
  metric_name = "SurgeQueueLength"

  dimensions = {
    LoadBalancerName = "${aws_elb.api_lb.name}"
  }

  statistic           = "Sum"
  period              = 60
  comparison_operator = "GreaterThanThreshold"
  threshold           = "512"
  evaluation_periods  = 2
  alarm_description = "This metric monitors elb excess surge que length"
  alarm_actions     = ["${aws_autoscaling_policy.scale_up.arn}", "arn:aws:sns:us-west-2:844297601570:ops_team_alerts"]
}

resource "aws_cloudwatch_metric_alarm" "surge-que-length-low" {
  alarm_name  = "${aws_elb.api_lb.name}-surge-que-length-low"
  namespace   = "AWS/ELB"
  metric_name = "SurgeQueueLength"

  dimensions = {
    LoadBalancerName = "${aws_elb.api_lb.name}"
  }

  statistic           = "Sum"
  period              = 60
  comparison_operator = "LessThanOrEqualToThreshold"
  threshold           = "512"
  evaluation_periods  = 2
  alarm_description = "This metric monitors elb reduced surge que length"
  alarm_actions     = ["${aws_autoscaling_policy.scale_down.arn}", "arn:aws:sns:us-west-2:844297601570:ops_team_alerts"]
}

resource "aws_cloudwatch_metric_alarm" "ELB-5XX" {
  alarm_name  = "${aws_elb.api_lb.name}-ELB-5XX"
  namespace   = "AWS/ELB"
  metric_name = "HTTPCode_ELB_5XX"

  dimensions = {
    LoadBalancerName = "${aws_elb.api_lb.name}"
  }

  statistic           = "Sum"
  period              = 60
  comparison_operator = "GreaterThanOrEqualToThreshold"
  threshold           = "1"
  evaluation_periods  = 2
  alarm_description = "This metric monitors the presence of healthy instances and absence of request spill overs"
  alarm_actions     = ["arn:aws:sns:us-west-2:844297601570:ops_team_alerts"]
}

variable "aws_region" {
  default = "us-west-2"
}
