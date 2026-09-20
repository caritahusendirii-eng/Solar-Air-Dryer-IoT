"""
Script untuk mengkonversi semua file Markdown dokumentasi ke HTML (siap cetak PDF).
Menggunakan library markdown (pure Python, no GTK dependency).

Cara pakai:
1. Install: pip install markdown
2. Jalankan: python convert_docs_to_pdf.py
3. Buka file HTML yang dihasilkan di browser
4. Ctrl+P > Save as PDF

Atau gunakan mode auto-pdf (memerlukan fpdf2):
  python convert_docs_to_pdf.py --auto
"""

import os
import sys
import re

def main():
    try:
        import markdown
    except ImportError:
        os.system(f"{sys.executable} -m pip install markdown")
        import markdown

    script_dir = os.path.dirname(os.path.abspath(__file__))
    docs_dir = os.path.join(script_dir, "docs")
    output_dir = os.path.join(script_dir, "docs", "output")
    os.makedirs(output_dir, exist_ok=True)

    md_files = [
        ("Lampiran_A1_Kode_Sumber.md", "Lampiran A1 - Dokumentasi Kode Sumber (ESP32 & Utilitas React)"),
        ("Lampiran_A2_Kode_Sumber.md", "Lampiran A2 - Dokumentasi Kode Sumber (Komponen React)"),
        ("Lampiran_A3_Kode_Sumber.md", "Lampiran A3 - Dokumentasi Kode Sumber (React Lanjutan & Flutter)"),
        ("Lampiran_B_Fungsi_Fitur.md", "Lampiran B - Fungsi dan Cara Kerja Setiap Fitur"),
        ("Lampiran_C_Step_by_Step.md", "Lampiran C - Langkah-Langkah Pembuatan Sistem"),
    ]

    CSS = """
    @page {
        size: A4;
        margin: 2cm 2.5cm;
    }
    @media print {
        body { font-size: 11pt; }
        pre { page-break-inside: avoid; }
        h2, h3 { page-break-after: avoid; }
        table { page-break-inside: avoid; }
    }
    body {
        font-family: 'Times New Roman', 'Georgia', serif;
        font-size: 12pt;
        line-height: 1.8;
        color: #1a1a1a;
        max-width: 210mm;
        margin: 0 auto;
        padding: 20px 40px;
    }
    h1 {
        font-size: 16pt;
        font-weight: bold;
        text-align: center;
        margin-bottom: 24pt;
        color: #000;
        border-bottom: 2px solid #333;
        padding-bottom: 12pt;
    }
    h2 {
        font-size: 13pt;
        font-weight: bold;
        margin-top: 24pt;
        margin-bottom: 8pt;
        color: #111;
        border-bottom: 1px solid #999;
        padding-bottom: 4pt;
    }
    h3 {
        font-size: 12pt;
        font-weight: bold;
        margin-top: 16pt;
        margin-bottom: 6pt;
        color: #222;
    }
    h4 {
        font-size: 11pt;
        font-weight: bold;
        margin-top: 12pt;
        color: #333;
    }
    p { margin-bottom: 8pt; text-align: justify; }
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 12pt 0;
        font-size: 10pt;
    }
    th, td {
        border: 1px solid #555;
        padding: 6pt 10pt;
        text-align: left;
        vertical-align: top;
    }
    th { background: #e0e0e0; font-weight: bold; }
    tr:nth-child(even) { background: #f8f8f8; }
    code {
        font-family: 'Courier New', monospace;
        font-size: 9pt;
        background: #f0f0f0;
        padding: 1pt 4pt;
        border-radius: 3pt;
    }
    pre {
        background: #f5f5f5;
        border: 1px solid #ccc;
        border-radius: 4pt;
        padding: 12pt;
        font-size: 8pt;
        line-height: 1.5;
        overflow-wrap: break-word;
        white-space: pre-wrap;
        word-wrap: break-word;
    }
    pre code { background: none; padding: 0; font-size: 8pt; }
    ul, ol { margin-bottom: 8pt; padding-left: 24pt; }
    li { margin-bottom: 4pt; }
    hr { border: none; border-top: 1px solid #bbb; margin: 20pt 0; }
    strong { font-weight: bold; }
    """

    print("=" * 60)
    print("  KONVERSI DOKUMENTASI MARKDOWN -> HTML/PDF")
    print("  Solar Dryer IoT - Lampiran Skripsi")
    print("=" * 60)

    generated = []

    for filename, title in md_files:
        md_path = os.path.join(docs_dir, filename)
        html_filename = filename.replace('.md', '.html')
        html_path = os.path.join(output_dir, html_filename)

        idx = md_files.index((filename, title)) + 1
        print(f"\n[{idx}/{len(md_files)}] {title}")

        if not os.path.exists(md_path):
            print(f"  SKIP: File {md_path} tidak ditemukan")
            continue

        with open(md_path, 'r', encoding='utf-8') as f:
            md_content = f.read()

        html_body = markdown.markdown(
            md_content,
            extensions=['tables', 'fenced_code', 'toc']
        )

        full_html = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>{title}</title>
<style>{CSS}</style>
</head>
<body>
{html_body}
</body>
</html>"""

        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(full_html)

        print(f"  [OK] HTML berhasil dibuat: {html_path}")
        generated.append(html_path)

    # Buat file index untuk membuka semua sekaligus
    index_path = os.path.join(output_dir, "index.html")
    index_html = """<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><title>Dokumentasi Solar Dryer IoT</title>
<style>
body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; }
h1 { color: #333; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; }
a { display: block; padding: 12px 20px; margin: 8px 0; background: #f8f9fa; border-radius: 8px;
    text-decoration: none; color: #1e40af; font-weight: 600; border: 1px solid #e2e8f0; }
a:hover { background: #eff6ff; border-color: #3b82f6; }
.info { background: #fef3c7; padding: 16px; border-radius: 8px; margin-top: 20px; border: 1px solid #fde68a; }
</style></head>
<body>
<h1>📄 Dokumentasi Solar Dryer IoT</h1>
<p>Klik masing-masing lampiran di bawah, lalu tekan <strong>Ctrl+P</strong> → <strong>Save as PDF</strong></p>
"""
    for filename, title in md_files:
        html_filename = filename.replace('.md', '.html')
        index_html += f'<a href="{html_filename}">{title}</a>\n'

    index_html += """
<div class="info">
<strong>💡 Cara menyimpan sebagai PDF:</strong><br>
1. Klik salah satu lampiran di atas<br>
2. Tekan <strong>Ctrl+P</strong> (atau Cmd+P di Mac)<br>
3. Pilih <strong>Save as PDF</strong> sebagai printer<br>
4. Klik <strong>Save</strong>
</div>
</body></html>"""

    with open(index_path, 'w', encoding='utf-8') as f:
        f.write(index_html)

    print(f"\n{'=' * 60}")
    print(f"  [OK] Selesai! {len(generated)} file HTML berhasil dibuat.")
    print(f"  [DIR] Output folder: {output_dir}")
    print(f"  [FILE] Buka file index: {index_path}")
    print(f"\n  CARA KONVERSI KE PDF:")
    print(f"  1. Buka index.html di browser")
    print(f"  2. Klik lampiran yang diinginkan")
    print(f"  3. Ctrl+P -> Save as PDF")
    print(f"{'=' * 60}")

    # Otomatis buka di browser
    import webbrowser
    webbrowser.open(f'file:///{index_path.replace(os.sep, "/")}')

if __name__ == "__main__":
    main()
