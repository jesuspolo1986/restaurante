import re

with open('gastro_local_pc_server.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

func_start = -1
func_end = -1
for idx, line in enumerate(lines):
    if 'def get_client_menu_html(' in line:
        func_start = idx
    if 'def get_ticket_html(' in line:
        func_end = idx
        break

for i in range(func_start, func_end):
    line = lines[i]
    # Look for ${ not followed by {
    matches = re.findall(r'\$\{[^{]', line)
    if matches:
        print(f"Line {i+1}: {line.strip().encode('ascii', errors='replace').decode()}")














