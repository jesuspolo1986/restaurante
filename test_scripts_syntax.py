import subprocess
import tempfile
import os
import re
import gastro_local_pc_server as s

db = s.load_db()
handler = s.GastroRequestHandler.__new__(s.GastroRequestHandler)

pages = {
    "admin": handler.get_admin_panel_html(db),
    "client": handler.get_client_menu_html(db, "[]", "[]", 55.0),
    "kitchen": handler.get_kitchen_view_html(db),
    "waiter": handler.get_waiter_view_html(db),
    "ticket": handler.get_ticket_html(db, db.get("orders", [{}])[0] if db.get("orders") else {}),
    "license": handler.get_license_locked_html({"status": "EXPIRED", "installationId": "TEST-1234", "message": "Licencia vencida", "expiryDate": "2026-08-01"})
}

for page_name, html_content in pages.items():
    if not html_content:
        continue
    scripts = re.findall(r'<script(?:\s+[^>]*)?>(.*?)</script>', html_content, re.DOTALL | re.IGNORECASE)
    print(f"Page '{page_name}': found {len(scripts)} scripts")
    for idx, script in enumerate(scripts):
        # Skip external scripts without body
        if not script.strip():
            continue
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as tf:
            tf.write(script)
            tf_path = tf.name
        try:
            res = subprocess.run(["node", "--check", tf_path], capture_output=True, text=True, encoding='utf-8')
            if res.returncode != 0:
                print(f"❌ SYNTAX ERROR in {page_name} script {idx}:")
                print(res.stderr)
            else:
                print(f"✅ {page_name} script {idx}: Syntax OK")
        finally:
            if os.path.exists(tf_path):
                os.remove(tf_path)
