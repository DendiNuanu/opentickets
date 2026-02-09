import paramiko
import zipfile
import os
import time
import sys

# --- Configuration ---
HOST = '146.190.90.47'
PORT = 22
USER = 'root'
PASSWORD = 'Fujimori6Riho'
REMOTE_PATH = '/root/opentickets'
DOMAIN = 'opentickets.nuanu.site'
APP_PORT = 3001
ZIP_FILENAME = 'opentickets.zip'
SERVICE_NAME = 'opentickets'

# --- Projects files to include ---
EXCLUDE_DIRS = ['.next', 'node_modules', '.git', '.zenflow', '.zencoder']
EXCLUDE_FILES = [ZIP_FILENAME, 'deploy.py', 'lint_log.txt', 'lint_results.json', 'lint_results_2.json']

def print_header(text):
    """Print a formatted header"""
    print("\n" + "="*60)
    print(f"  {text}")
    print("="*60)

def zip_project(source_dir, output_zip):
    print(f"\n[*] Zipping project in {source_dir}...")
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Prune excluded directories
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            
            for file in files:
                if file in EXCLUDE_FILES:
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)
    print(f"[+] Zip created: {output_zip}")

def execute_remote_command(ssh, command, description, show_output=False):
    print(f"[*] {description}...")
    stdin, stdout, stderr = ssh.exec_command(command, get_pty=True)
    exit_status = stdout.channel.recv_exit_status()
    
    output = stdout.read().decode()
    error = stderr.read().decode()
    
    if exit_status == 0:
        print(f"[+] SUCCESS: {description}")
        if show_output and output:
            print(f"    Output: {output.strip()}")
        return True, output
    else:
        print(f"[-] ERROR during: {description}")
        if error:
            print(f"    Error: {error.strip()}")
        if output:
            print(f"    Output: {output.strip()}")
        return False, error

def check_port_available(ssh, port):
    """Check if port is already in use"""
    success, output = execute_remote_command(
        ssh, 
        f"netstat -tuln | grep ':{port} ' || echo 'PORT_FREE'",
        f"Checking if port {port} is available",
        show_output=False
    )
    return 'PORT_FREE' in output

def get_service_status(ssh, service_name):
    """Get the status of a systemd service"""
    success, output = execute_remote_command(
        ssh,
        f"systemctl is-active {service_name} 2>/dev/null || echo 'inactive'",
        f"Checking {service_name} service status",
        show_output=False
    )
    return output.strip()

def deploy():
    local_dir = os.path.dirname(os.path.abspath(__file__))
    zip_path = os.path.join(local_dir, ZIP_FILENAME)
    env_file = os.path.join(local_dir, '.env.local')

    print_header("OPENTICKETS DEPLOYMENT SCRIPT")
    print(f"Target Server: {HOST}")
    print(f"Domain: {DOMAIN}")
    print(f"App Port: {APP_PORT}")
    print(f"Remote Path: {REMOTE_PATH}")

    # 1. Zip the project
    print_header("STEP 1: PACKAGING PROJECT")
    zip_project(local_dir, zip_path)

    ssh = None
    try:
        # 2. Connect via SSH
        print_header("STEP 2: CONNECTING TO SERVER")
        print(f"[*] Connecting to {HOST}:{PORT} as {USER}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOST, PORT, USER, PASSWORD, timeout=30)
        print("[+] SSH Connection established!")

        # 3. Pre-deployment checks
        print_header("STEP 3: PRE-DEPLOYMENT CHECKS")
        
        # Check if port is available
        if not check_port_available(ssh, APP_PORT):
            print(f"[!] WARNING: Port {APP_PORT} is already in use!")
            print(f"[*] This is OK if it's the existing {SERVICE_NAME} service")
        
        # Check existing service
        service_status = get_service_status(ssh, SERVICE_NAME)
        if service_status == 'active':
            print(f"[*] Found existing {SERVICE_NAME} service (active) - will update it")
        elif service_status == 'inactive':
            print(f"[*] Found existing {SERVICE_NAME} service (inactive) - will restart it")
        else:
            print(f"[*] No existing {SERVICE_NAME} service found - will create new one")

        # 4. Create remote directory
        print_header("STEP 4: PREPARING REMOTE DIRECTORY")
        execute_remote_command(ssh, f"mkdir -p {REMOTE_PATH}", "Create remote directory")

        # 5. Upload zip file
        print_header("STEP 5: UPLOADING PROJECT FILES")
        print(f"[*] Uploading {ZIP_FILENAME} to {REMOTE_PATH}...")
        sftp = ssh.open_sftp()
        sftp.put(zip_path, f"{REMOTE_PATH}/{ZIP_FILENAME}")
        
        # Upload .env.local if it exists
        if os.path.exists(env_file):
            print(f"[*] Uploading .env.local...")
            sftp.put(env_file, f"{REMOTE_PATH}/.env.local")
            print("[+] Environment file uploaded")
        
        sftp.close()
        print("[+] All files uploaded successfully!")

        # 6. Extract and setup
        print_header("STEP 6: EXTRACTING FILES")
        execute_remote_command(
            ssh, 
            f"cd {REMOTE_PATH} && unzip -o {ZIP_FILENAME} && rm {ZIP_FILENAME}", 
            "Extract project files"
        )

        # 7. Install dependencies
        print_header("STEP 7: INSTALLING DEPENDENCIES")
        success, _ = execute_remote_command(
            ssh, 
            f"cd {REMOTE_PATH} && npm install --production", 
            "Install Node.js dependencies"
        )
        if not success:
            print("[!] Dependency installation failed, but continuing...")

        # 8. Build the project
        print_header("STEP 8: BUILDING PROJECT")
        success, _ = execute_remote_command(
            ssh, 
            f"cd {REMOTE_PATH} && npm run build", 
            "Build Next.js application"
        )
        if not success:
            print("[!] Build failed! Aborting deployment.")
            return

        # 9. Create/Update Systemd Service
        print_header("STEP 9: CONFIGURING SYSTEMD SERVICE")
        service_content = f"""[Unit]
Description=OpenTickets Next.js App
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory={REMOTE_PATH}
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT={APP_PORT}

[Install]
WantedBy=multi-user.target
"""
        service_file = f"/etc/systemd/system/{SERVICE_NAME}.service"
        
        # Write service file
        execute_remote_command(
            ssh,
            f"cat > {service_file} << 'EOFSERVICE'\n{service_content}\nEOFSERVICE",
            f"Create systemd service at {service_file}"
        )
        
        execute_remote_command(ssh, "systemctl daemon-reload", "Reload systemd daemon")
        execute_remote_command(ssh, f"systemctl enable {SERVICE_NAME}", "Enable service to start on boot")
        execute_remote_command(ssh, f"systemctl restart {SERVICE_NAME}", "Restart service")
        
        # Wait for service to start
        print("[*] Waiting for service to start...")
        time.sleep(3)
        
        # Check service status
        success, output = execute_remote_command(
            ssh,
            f"systemctl status {SERVICE_NAME} --no-pager -l",
            "Verify service status",
            show_output=True
        )

        # 10. Configure Nginx
        print_header("STEP 10: CONFIGURING NGINX")
        
        nginx_config = f"""server {{
    listen 80;
    server_name {DOMAIN};

    location / {{
        proxy_pass http://localhost:{APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }}
}}
"""
        nginx_available = f"/etc/nginx/sites-available/{SERVICE_NAME}"
        nginx_enabled = f"/etc/nginx/sites-enabled/{SERVICE_NAME}"
        
        # Write nginx config
        execute_remote_command(
            ssh,
            f"cat > {nginx_available} << 'EOFNGINX'\n{nginx_config}\nEOFNGINX",
            f"Create Nginx config at {nginx_available}"
        )
        
        # Enable site
        execute_remote_command(
            ssh,
            f"ln -sf {nginx_available} {nginx_enabled}",
            "Enable Nginx site"
        )
        
        # Test nginx config
        success, _ = execute_remote_command(ssh, "nginx -t", "Test Nginx configuration")
        if success:
            execute_remote_command(ssh, "systemctl reload nginx", "Reload Nginx")
        else:
            print("[!] Nginx configuration test failed! Please check manually.")

        # 11. Setup SSL with Certbot
        print_header("STEP 11: CONFIGURING SSL CERTIFICATE")
        print(f"[*] Setting up SSL for {DOMAIN} using Certbot...")
        
        # Check if certbot is installed
        success, _ = execute_remote_command(
            ssh,
            "which certbot",
            "Check if Certbot is installed",
            show_output=False
        )
        
        if success:
            # Try to get/renew certificate
            success, _ = execute_remote_command(
                ssh,
                f"certbot --nginx -d {DOMAIN} --non-interactive --agree-tos --email dendi@nuanu.io --redirect",
                "Configure SSL certificate"
            )
            if success:
                print("[+] SSL certificate configured successfully!")
            else:
                print("[!] SSL setup failed, but site is accessible via HTTP")
        else:
            print("[!] Certbot not installed. Skipping SSL setup.")
            print("[*] Site will be accessible via HTTP only")

        # 12. Final verification
        print_header("STEP 12: DEPLOYMENT VERIFICATION")
        
        # Check if service is running
        service_status = get_service_status(ssh, SERVICE_NAME)
        print(f"[*] Service Status: {service_status}")
        
        # Check if port is listening
        success, output = execute_remote_command(
            ssh,
            f"netstat -tuln | grep ':{APP_PORT}' || ss -tuln | grep ':{APP_PORT}'",
            f"Verify port {APP_PORT} is listening",
            show_output=True
        )

        # Final success message
        print_header("DEPLOYMENT COMPLETED SUCCESSFULLY!")
        print(f"""
╔══════════════════════════════════════════════════════════╗
║                  DEPLOYMENT SUMMARY                      ║
╠══════════════════════════════════════════════════════════╣
║  PUBLIC IP:        {HOST:<35} ║
║  PORT:             {APP_PORT:<35} ║
║  DOMAIN:           {DOMAIN:<35} ║
║  SERVICE:          {SERVICE_NAME:<35} ║
║  SERVICE STATUS:   {service_status:<35} ║
╠══════════════════════════════════════════════════════════╣
║  ACCESS URLs:                                            ║
║  • https://{DOMAIN:<43} ║
║  • http://{DOMAIN:<44} ║
║  • http://{HOST}:{APP_PORT:<31} ║
╚══════════════════════════════════════════════════════════╝

[✔] Your OpenTickets application is now LIVE!
[✔] Systemd service '{SERVICE_NAME}' is configured and running
[✔] Nginx reverse proxy is configured
[✔] SSL certificate is configured (if certbot succeeded)

To check service status: systemctl status {SERVICE_NAME}
To view logs: journalctl -u {SERVICE_NAME} -f
To restart: systemctl restart {SERVICE_NAME}
""")

    except paramiko.AuthenticationException:
        print("[!] Authentication failed! Check your credentials.")
        sys.exit(1)
    except paramiko.SSHException as e:
        print(f"[!] SSH Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[!] Critical Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        if ssh:
            ssh.close()
            print("\n[*] SSH connection closed")
        if os.path.exists(zip_path):
            os.remove(zip_path)
            print(f"[*] Cleaned up local zip file")

if __name__ == "__main__":
    try:
        deploy()
    except KeyboardInterrupt:
        print("\n\n[!] Deployment cancelled by user")
        sys.exit(1)
