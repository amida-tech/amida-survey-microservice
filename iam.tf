# iam roles
resource "aws_iam_role" "app-ec2-role" {
    name = "${var.service_name}-ec2-role"
    assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Effect": "Allow",
      "Sid": ""
    }
  ]
}
EOF
}
resource "aws_iam_instance_profile" "app-ec2-role" {
    name = "${var.service_name}-ec2-role"
    roles = ["${aws_iam_role.app-ec2-role.name}"]
}

# policies
resource "aws_iam_policy_attachment" "app-attach1" {
    name = "${var.service_name}-attach1"
    roles = ["${aws_iam_role.app-ec2-role.name}"]
    policy_arn = "arn:aws:iam::aws:policy/CloudWatchFullAccess"
}

resource "aws_iam_policy_attachment" "app-attach2" {
    name = "${var.service_name}-attach2"
    roles = ["${aws_iam_role.app-ec2-role.name}"]
    policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess"
}
