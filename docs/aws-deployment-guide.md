# AWS Deployment Guide

This guide will walk you through deploying the Zeidgeist Prompter application on AWS. We'll use AWS Elastic Beanstalk for a simplified deployment process.

## Prerequisites

1. AWS Account
2. AWS CLI installed and configured
3. Python 3.11 or later
4. Git
5. SSH access to EC2 instance (ec2-3-94-159-172.compute-1.amazonaws.com)

## AWS Credentials Setup

1. Create an IAM User:
   - Go to AWS IAM Console
   - Click "Users" → "Add user"
   - Set username (e.g., "zeidgeist-deployer")
   - Select "Access key - Programmatic access"
   - Click "Next: Permissions"
   - Attach the following policies:
     - `AWSElasticBeanstalkFullAccess`
     - `AWSElasticBeanstalkService`
     - `AWSElasticBeanstalkEnhancedHealth`
     - `AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy`
     - `EC2InstanceConnect` (for SSH access)

2. Configure AWS CLI:
   ```bash
   aws configure
   ```
   Enter the following when prompted:
   - AWS Access Key ID: [Your Access Key]
   - AWS Secret Access Key: [Your Secret Key]
   - Default region name: us-east-1
   - Default output format: json

3. Create an Elastic Beanstalk Application:
   ```bash
   eb init zeidgeist-prompter
   ```
   Select your region and create a new application.

## Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# AWS Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-east-1

# Application Settings
FLASK_ENV=production
SECRET_KEY=your_secret_key
HOST=0.0.0.0
PORT=5000
```

## Deployment Steps

1. Install required packages:
   ```bash
   pip install -r requirements.txt
   ```

2. Create an Elastic Beanstalk environment:
   ```bash
   eb create zeidgeist-prod
   ```
   Select your environment type (e.g., Load Balancer, Single Instance)

3. Deploy your application:
   ```bash
   eb deploy
   ```

4. SSH into the EC2 instance:
   ```bash
   ssh -i your-key.pem ec2-user@ec2-3-94-159-172.compute-1.amazonaws.com
   ```

5. Set up the application on the EC2 instance:
   ```bash
   # Clone the repository
   git clone [your-repo-url]
   cd zeidgeist-prompter

   # Create and activate virtual environment
   python3 -m venv venv
   source venv/bin/activate

   # Install dependencies
   pip install -r requirements.txt

   # Set up environment variables
   cp .env.example .env
   # Edit .env with your production values

   # Run the application
   gunicorn app:app -b 0.0.0.0:5000
   ```

6. Set up systemd service (for automatic startup):
   ```bash
   sudo nano /etc/systemd/system/zeidgeist.service
   ```
   Add the following content:
   ```ini
   [Unit]
   Description=Zeidgeist Prompter
   After=network.target

   [Service]
   User=ec2-user
   WorkingDirectory=/home/ec2-user/zeidgeist-prompter
   Environment="PATH=/home/ec2-user/zeidgeist-prompter/venv/bin"
   ExecStart=/home/ec2-user/zeidgeist-prompter/venv/bin/gunicorn app:app -b 0.0.0.0:5000
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

7. Start the service:
   ```bash
   sudo systemctl start zeidgeist
   sudo systemctl enable zeidgeist
   ```

8. Monitor deployment:
   ```bash
   eb status
   eb health
   sudo systemctl status zeidgeist
   ```

## Security Considerations

1. Never commit AWS credentials to version control
2. Use AWS Secrets Manager for sensitive data
3. Regularly rotate access keys
4. Follow the principle of least privilege for IAM roles
5. Configure security groups to allow only necessary ports (5000 for the application)
6. Use HTTPS for secure communication

## Troubleshooting

1. Check deployment logs:
   ```bash
   eb logs
   sudo journalctl -u zeidgeist
   ```

2. SSH into your EC2 instance:
   ```bash
   ssh -i your-key.pem ec2-user@ec2-3-94-159-172.compute-1.amazonaws.com
   ```

3. Common issues:
   - Environment variables not set
   - Permission issues
   - Port conflicts
   - Memory constraints
   - Security group restrictions

## Maintenance

1. Update application:
   ```bash
   git pull
   source venv/bin/activate
   pip install -r requirements.txt
   sudo systemctl restart zeidgeist
   ```

2. Scale environment:
   ```bash
   eb scale 2  # Scale to 2 instances
   ```

3. Terminate environment:
   ```bash
   eb terminate zeidgeist-prod
   ```

## Additional Resources

- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elastic-beanstalk/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Security Best Practices](https://docs.aws.amazon.com/well-architected/latest/security-pillar/security.html) 