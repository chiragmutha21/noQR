import socket
import os
import re

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

ip = get_ip()

print("=" * 50)
print(f"[*] Detected Local IP: {ip}")
print(f"[*] MOBILE ACCESS LINK: http://{ip}.nip.io:3000")
print("=" * 50)

env_path = 'frontend/.env.local'
if not os.path.exists(env_path):
    print("WARNING: frontend/.env.local not found. Creating a blank one.")
    content = ""
else:
    with open(env_path, 'r') as f:
        content = f.read()

# Update NEXT_PUBLIC_API_URL
if 'NEXT_PUBLIC_API_URL=' in content:
    content = re.sub(r'NEXT_PUBLIC_API_URL=.*', f'NEXT_PUBLIC_API_URL=http://{ip}.nip.io:5000/api', content)
else:
    content += f'\nNEXT_PUBLIC_API_URL=http://{ip}.nip.io:5000/api'

# Update NEXTAUTH_URL
if 'NEXTAUTH_URL=' in content:
    content = re.sub(r'NEXTAUTH_URL=.*', f'NEXTAUTH_URL=http://{ip}.nip.io:3000', content)
else:
    content += f'\nNEXTAUTH_URL=http://{ip}.nip.io:3000'

os.makedirs("frontend", exist_ok=True)
with open(env_path, 'w') as f:
    f.write(content.strip() + '\n')
print("[*] Automatically configured frontend/.env.local with new IP settings.")
