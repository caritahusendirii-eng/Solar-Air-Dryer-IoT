import markdown
import os
import subprocess

MD_PATH = r"C:\Users\Abel Rizky\.gemini\antigravity\brain\668747a3-db80-4e38-8dde-5227fa062585\desain_sistem_aplikasi.md"
OUT_DIR = r"c:\Users\Abel Rizky\OneDrive\Documents\Tugas Akhir\aplikasi\smart-ac-dashboard"
HTML_PATH = os.path.join(OUT_DIR, "Desain_Sistem_Solar_Dryer_IoT.html")
PDF_PATH = os.path.join(OUT_DIR, "Desain_Sistem_Solar_Dryer_IoT.pdf")

with open(MD_PATH, "r", encoding="utf-8") as f:
    md_text = f.read()

# Replace mermaid with pre code blocks for display
import re
md_text = re.sub(r'```mermaid(.*?)```', r'<pre class="mermaid">\1</pre>', md_text, flags=re.DOTALL)

html_body = markdown.markdown(md_text, extensions=['tables', 'fenced_code'])

CSS = """
@page { size: A4; margin: 1.5cm 2cm; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; max-width: 800px; margin: 0 auto; padding: 20px; }
h1 { font-size: 22pt; color: #1e3a5f; border-bottom: 3px solid #e85d04; padding-bottom: 8px; margin-top: 20px; }
h2 { font-size: 16pt; color: #2c5282; border-bottom: 1.5px solid #bee3f8; padding-bottom: 4px; margin-top: 24px; page-break-after: avoid; }
h3 { font-size: 13pt; color: #2d3748; margin-top: 18px; page-break-after: avoid; }
table { border-collapse: collapse; width: 100%; margin: 10px 0 16px 0; font-size: 10pt; page-break-inside: avoid; }
th { background: #2c5282; color: white; padding: 8px 10px; text-align: left; font-weight: 600; }
td { padding: 6px 10px; border: 1px solid #cbd5e0; }
tr:nth-child(even) td { background: #f7fafc; }
code { background: #edf2f7; padding: 2px 5px; border-radius: 3px; font-size: 9.5pt; font-family: 'Consolas', monospace; color: #d97706; }
pre { background: #1a202c; color: #e2e8f0; padding: 12px 16px; border-radius: 6px; font-size: 9pt; overflow-x: auto; white-space: pre-wrap; page-break-inside: avoid; }
pre code { background: transparent; color: inherit; padding: 0; }
pre.mermaid { background: #f8fafc; color: #334155; border: 1px solid #e2e8f0; font-family: monospace; white-space: pre-wrap; }
blockquote { border-left: 4px solid #e85d04; background: #fffaf0; padding: 10px 16px; margin: 12px 0; font-style: italic; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
ul, ol { margin-top: 8px; margin-bottom: 16px; padding-left: 24px; }
li { margin-bottom: 4px; }
@media print {
    body { padding: 0; max-width: none; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
}
"""

full_html = f"<!DOCTYPE html><html><head><meta charset='utf-8'><title>Desain Sistem Solar Dryer IoT</title><style>{CSS}</style></head><body>{html_body}</body></html>"

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(full_html)

print(f"HTML berhasil dibuat: {HTML_PATH}")

# Try to use Edge to convert HTML to PDF
try:
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    edge_exe = next((p for p in edge_paths if os.path.exists(p)), None)
    
    if edge_exe:
        print(f"Menggunakan Edge untuk convert ke PDF...")
        cmd = [edge_exe, "--headless", "--disable-gpu", f"--print-to-pdf={PDF_PATH}", f"file:///{HTML_PATH.replace(chr(92), '/')}"]
        subprocess.run(cmd, check=True)
        print(f"PDF berhasil dibuat: {PDF_PATH}")
    else:
        print("Microsoft Edge tidak ditemukan. Silakan buka file HTML dan Print ke PDF secara manual.")
except Exception as e:
    print(f"Gagal convert otomatis ke PDF: {e}")
    print("Silakan buka file HTML dan Print ke PDF secara manual.")
