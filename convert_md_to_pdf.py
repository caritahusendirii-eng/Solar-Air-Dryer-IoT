"""Convert the system design markdown to PDF using fpdf2's markdown support."""
import re
from fpdf import FPDF

MD_PATH = r"C:\Users\Abel Rizky\.gemini\antigravity\brain\668747a3-db80-4e38-8dde-5227fa062585\desain_sistem_aplikasi.md"
PDF_PATH = r"c:\Users\Abel Rizky\OneDrive\Documents\Tugas Akhir\aplikasi\smart-ac-dashboard\Desain_Sistem_Solar_Dryer_IoT.pdf"

with open(MD_PATH, "r", encoding="utf-8") as f:
    md_text = f.read()

# Remove emojis and unsupported unicode characters
import re
md_text = re.sub(r'[^\x00-\x7F]+', '', md_text) # Only keep ascii characters
# Or better yet, we can keep some latin characters but remove emojis.
# For simplicity, since the document is in Indonesian (mostly ASCII + some standard punctuation),
# keeping ASCII is generally safe, but we might lose some degree symbol (°).
# Let's replace specific problematic emojis or replace all non-ascii with nothing except '°'.
md_text = md_text.encode('ascii', 'ignore').decode('ascii').replace('?C', 'C') # degree symbol workaround
# Wait, let's just use regex to remove common emojis
md_text = re.sub(r'[\U00010000-\U0010ffff]', '', md_text) # Emojis
md_text = re.sub(r'[\u2600-\u27BF]', '', md_text) # More emojis

pdf = FPDF()
pdf.set_auto_page_break(auto=True, margin=15)
pdf.add_page()

# Try to use a nicer font if available, fall back to Helvetica
pdf.set_font("Helvetica", size=10)

# Use fpdf2's built-in markdown rendering
pdf.write_html("""
<h1 style="color:#1e3a5f">Desain Sistem Aplikasi Solar Dryer IoT</h1>
""")

# Process markdown sections
lines = md_text.split('\n')
in_code = False
in_table = False
table_rows = []
code_block = []

def flush_table(pdf, rows):
    if not rows:
        return
    # Parse header and data
    cols = [c.strip() for c in rows[0].split('|')[1:-1]]
    num_cols = len(cols)
    if num_cols == 0:
        return
    col_w = (pdf.w - 20) / num_cols
    
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(44, 82, 130)
    pdf.set_text_color(255, 255, 255)
    for c in cols:
        pdf.cell(col_w, 7, c.strip(), border=1, fill=True, align="C")
    pdf.ln()
    pdf.set_text_color(0, 0, 0)
    
    data_rows = rows[2:]  # skip separator
    for i, row in enumerate(data_rows):
        cells = [c.strip() for c in row.split('|')[1:-1]]
        pdf.set_font("Helvetica", "", 7)
        if i % 2 == 0:
            pdf.set_fill_color(247, 250, 252)
        else:
            pdf.set_fill_color(255, 255, 255)
        for c in cells[:num_cols]:
            c_clean = re.sub(r'[`*]', '', c)
            pdf.cell(col_w, 6, c_clean, border=1, fill=True)
        pdf.ln()
    pdf.ln(3)

for line in lines:
    stripped = line.strip()
    
    # Code blocks
    if stripped.startswith('```'):
        if in_code:
            in_code = False
            code_text = '\n'.join(code_block)
            pdf.set_font("Courier", "", 7)
            pdf.set_fill_color(26, 32, 44)
            pdf.set_text_color(226, 232, 240)
            pdf.multi_cell(0, 4, code_text, fill=True)
            pdf.set_text_color(0, 0, 0)
            pdf.ln(3)
            code_block = []
        else:
            if in_table:
                flush_table(pdf, table_rows)
                table_rows = []
                in_table = False
            in_code = True
        continue
    
    if in_code:
        code_block.append(line.rstrip())
        continue
    
    # Table rows
    if '|' in stripped and stripped.startswith('|'):
        if not in_table:
            in_table = True
        table_rows.append(stripped)
        continue
    elif in_table:
        flush_table(pdf, table_rows)
        table_rows = []
        in_table = False
    
    # Skip empty
    if not stripped:
        continue
    
    # Horizontal rule
    if stripped == '---':
        pdf.ln(2)
        pdf.set_draw_color(200, 200, 200)
        pdf.line(10, pdf.get_y(), pdf.w - 10, pdf.get_y())
        pdf.ln(4)
        continue
    
    # Headers
    if stripped.startswith('# '):
        pdf.ln(5)
        pdf.set_font("Helvetica", "B", 18)
        pdf.set_text_color(30, 58, 95)
        title = re.sub(r'[#]+\s*', '', stripped)
        pdf.cell(0, 10, title, ln=True)
        pdf.set_draw_color(232, 93, 4)
        pdf.set_line_width(0.8)
        pdf.line(10, pdf.get_y(), pdf.w - 10, pdf.get_y())
        pdf.set_line_width(0.2)
        pdf.ln(4)
        pdf.set_text_color(0, 0, 0)
        continue
    
    if stripped.startswith('## '):
        pdf.ln(4)
        pdf.set_font("Helvetica", "B", 14)
        pdf.set_text_color(44, 82, 130)
        title = re.sub(r'[#]+\s*', '', stripped)
        pdf.cell(0, 8, title, ln=True)
        pdf.set_draw_color(190, 227, 248)
        pdf.line(10, pdf.get_y(), pdf.w - 10, pdf.get_y())
        pdf.ln(3)
        pdf.set_text_color(0, 0, 0)
        continue
    
    if stripped.startswith('### '):
        pdf.ln(3)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(45, 55, 72)
        title = re.sub(r'[#]+\s*', '', stripped)
        pdf.cell(0, 7, title, ln=True)
        pdf.ln(2)
        pdf.set_text_color(0, 0, 0)
        continue
    
    # Blockquote
    if stripped.startswith('>'):
        text = re.sub(r'^>\s*', '', stripped)
        text = re.sub(r'[*`]', '', text)
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_fill_color(255, 250, 240)
        pdf.set_text_color(100, 100, 100)
        pdf.multi_cell(0, 5, text, fill=True)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(2)
        continue
    
    # Regular text
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', stripped)
    text = re.sub(r'`(.*?)`', r'\1', text)
    text = re.sub(r'\[(.*?)\]\(.*?\)', r'\1', text)
    
    if stripped.startswith('- ') or stripped.startswith('* '):
        pdf.set_font("Helvetica", "", 9)
        pdf.cell(5)
        pdf.cell(0, 5, "- " + text[2:], ln=True)
    else:
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(0, 5, text)

# Flush remaining table
if in_table:
    flush_table(pdf, table_rows)

pdf.output(PDF_PATH)
print(f"PDF berhasil dibuat: {PDF_PATH}")
