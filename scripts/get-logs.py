import paramiko
import sys

# --- Configuration ---
HOST = '146.190.90.47'
PORT = 22
USER = 'root'
PASSWORD = 'Fujimori6Riho'
SERVICE_NAME = 'opentickets'

def get_logs():
    ssh = None
    try:
        print(f"[*] Connecting to {HOST}...")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(HOST, PORT, USER, PASSWORD, timeout=30)
        
        print(f"[*] Fetching last 50 lines of logs for {SERVICE_NAME}...")
        command = f"journalctl -u {SERVICE_NAME} -n 50 --no-pager"
        stdin, stdout, stderr = ssh.exec_command(command)
        
        output = stdout.read().decode()
        error = stderr.read().decode()
        
        if output:
            print("\n--- REMOTE LOGS ---\n")
            print(output)
            print("\n-------------------\n")
        
        if error:
            print(f"[!] Remote Error Output: {error}")
            
    except Exception as e:
        print(f"[!] Error: {e}")
    finally:
        if ssh:
            ssh.close()

if __name__ == "__main__":
    get_logs()
