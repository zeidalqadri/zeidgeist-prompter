# EC2 Deployment Steps

This document provides detailed steps to deploy the Zeidgeist Prompter application to the EC2 instance once connectivity is restored.

## Prerequisites

- SSH access to the EC2 instance at `ec2-3-94-159-172.compute-1.amazonaws.com`
- SSH key file (`zeidgeist-prompter_key.pem`) with proper permissions (chmod 400)
- Built Next.js application (`zeidgeist-production.tar.gz`)
- Node.js (v16+) and npm installed on the EC2 instance

## Troubleshooting EC2 Connectivity Issues

If you're unable to connect to the EC2 instance, check the following:

1. **Verify Instance State**: 
   - Log into the AWS Console
   - Navigate to EC2 Dashboard
   - Check if the instance is running (not stopped or terminated)

2. **Security Group Settings**:
   - Ensure the security group allows inbound traffic on port 22 (SSH)
   - Add your IP address to the allowed sources
   - Command to check security group settings:
     ```bash
     aws ec2 describe-security-groups --group-ids YOUR_SECURITY_GROUP_ID
     ```

3. **Network ACLs**:
   - Check that network ACLs are not blocking traffic
   - Command to check network ACLs:
     ```bash
     aws ec2 describe-network-acls
     ```

4. **Instance Health Check**:
   - Verify that the instance is healthy
   - Command to check instance health:
     ```bash
     aws ec2 describe-instance-status --instance-ids YOUR_INSTANCE_ID
     ```

## Steps to Deploy

### 1. Verify SSH Connectivity

```bash
# Test SSH connection
ssh -i zeidgeist-prompter_key.pem ec2-user@ec2-3-94-159-172.compute-1.amazonaws.com
```

### 2. Transfer Application Files

```bash
# Copy the application archive to the EC2 instance
scp -i zeidgeist-prompter_key.pem zeidgeist-production.tar.gz ec2-user@ec2-3-94-159-172.compute-1.amazonaws.com:~
```

### 3. Setup the Application on EC2

Connect to the instance and run:

```bash
# Create directory for the application
mkdir -p zeidgeist-app

# Extract the application
tar -xzf zeidgeist-production.tar.gz -C zeidgeist-app

# Navigate to the application directory
cd zeidgeist-app

# Make the start script executable
chmod +x start.sh

# Run the start script to install dependencies and start the application
./start.sh
```

### 4. Run the Application with PM2

Install PM2 if not already installed:

```bash
# Install PM2 globally
npm install -g pm2

# Start the application with PM2
pm2 start npm --name "zeidgeist-prompter" -- start

# Make PM2 start on system boot
pm2 startup
pm2 save
```

### 5. Configure Nginx as a Reverse Proxy

Install and configure Nginx:

```bash
# Install Nginx
sudo amazon-linux-extras install nginx1

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Create Nginx configuration
sudo nano /etc/nginx/conf.d/zeidgeist.conf
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name ec2-3-94-159-172.compute-1.amazonaws.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 6. Setup SSL (Optional but Recommended)

```bash
# Install Certbot
sudo amazon-linux-extras install epel
sudo yum install certbot python-certbot-nginx

# Obtain and configure SSL certificate
sudo certbot --nginx -d ec2-3-94-159-172.compute-1.amazonaws.com
```

### 7. Firewall Configuration

Ensure the security group allows traffic on ports 22 (SSH), 80 (HTTP), and 443 (HTTPS).

### 8. Verify Deployment

Open `http://ec2-3-94-159-172.compute-1.amazonaws.com` in a browser to verify that the application is running.

## Alternative Deployment Methods

If you cannot access the EC2 instance, consider these alternatives:

### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

### 2. Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy
```

### 3. Use AWS Elastic Beanstalk

```bash
# Install EB CLI
pip install awsebcli

# Initialize EB application
eb init

# Deploy
eb create
```

## Updating the Application

To update the application:

```bash
# Connect to the EC2 instance
ssh -i zeidgeist-prompter_key.pem ec2-user@ec2-3-94-159-172.compute-1.amazonaws.com

# Navigate to the application directory
cd zeidgeist-app

# Stop the application
pm2 stop zeidgeist-prompter

# Extract the updated archive
tar -xzf ~/zeidgeist-production.tar.gz -C .

# Start the application
pm2 start zeidgeist-prompter
```

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs zeidgeist-prompter

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### SSL Certificate Issues

```bash
# Check SSL certificate status
sudo certbot certificates

# Renew SSL certificate
sudo certbot renew
```

### Connection Issues

- Verify that the EC2 instance is running
- Check security group settings to ensure SSH access is allowed
- Verify that the SSH key has the correct permissions (chmod 400)

## Maintenance

- Regularly update the application and dependencies
- Monitor server resources and scale as needed
- Backup the application data
- Rotate API keys periodically 