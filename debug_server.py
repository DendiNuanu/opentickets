import paramiko
import os

HOST = '146.190.90.47'
PORT = 22
USER = 'root'
PASSWORD = 'Fujimori6Riho'
REMOTE_PATH = '/root/opentickets'

def debug_server():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, PORT, USER, PASSWORD, timeout=30)
        
        commands = [
            "curl -I http://localhost:3001/uploads/5488f79d-f4b9-427f-8346-2fe2047c95a4.jpg",
            "journalctl -u opentickets -n 50 --no-pager | grep 'FORCED SERVE'"
        ]
        
        for cmd in commands:
            print(f"\n--- Executing: {cmd} ---")
            stdin, stdout, stderr = ssh.exec_command(cmd)
            print(stdout.read().decode())
            print(stderr.read().decode())
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        ssh.close()

if __name__ == "__main__":
    debug_server()
