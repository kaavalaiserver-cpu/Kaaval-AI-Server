import os
import glob

src_dir = r"f:\kaaval ai server\admin dashboard\kaaval-backend\src"
files = glob.glob(os.path.join(src_dir, "**", "*.ts"), recursive=True)

search_str = "'SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER'"
replace_str = "'SUPER_ADMIN', 'ADMIN_SAJIV', 'ADMIN_BINU', 'ADMIN_HARISH', 'SP', 'DSP', 'DEVELOPER'"

search_str2 = "['SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER']"
replace_str2 = "['SUPER_ADMIN', 'ADMIN_SAJIV', 'ADMIN_BINU', 'ADMIN_HARISH', 'SP', 'DSP', 'DEVELOPER']"

for filepath in files:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = content.replace(search_str, replace_str)
    new_content = new_content.replace(search_str2, replace_str2)
    
    if content != new_content:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"Patched: {filepath}")
