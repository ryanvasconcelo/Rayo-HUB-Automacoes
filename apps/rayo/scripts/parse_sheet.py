import xml.etree.ElementTree as ET
import re

def col2num(col):
    num = 0
    for c in col:
        num = num * 26 + (ord(c.upper()) - ord('A')) + 1
    return num

def cell_coords(address):
    match = re.match(r'([A-Za-z]+)([0-9]+)', address)
    if not match: return None, None
    return match.group(1), int(match.group(2))

tree = ET.parse('/Users/ryanrichard/projecont/Rayo/temp/braga/unzipped_excel/xl/worksheets/sheet1.xml')
root = tree.getroot()

ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

cells = {}
for row in root.findall('.//ns:row', ns):
    r = int(row.get('r'))
    for c in row.findall('ns:c', ns):
        ref = c.get('r')
        v = c.find('ns:v', ns)
        f = c.find('ns:f', ns)
        
        val = v.text if v is not None else ''
        form = f.text if f is not None else ''
        
        col, _ = cell_coords(ref)
        cells[(col, r)] = (val, form)

# Let's print row 4
print("--- Row 4 ---")
for col in ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI']:
    if (col, 4) in cells:
        print(f"{col}4: val={cells[(col, 4)][0]} form={cells[(col, 4)][1]}")

print("\n--- Row 7 (Headers) ---")
for col in ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI']:
    if (col, 7) in cells:
        print(f"{col}7: val={cells[(col, 7)][0]} form={cells[(col, 7)][1]}")
        
print("\n--- Row 8 (Data) ---")
for col in ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ']:
    if (col, 8) in cells:
        print(f"{col}8: val={cells[(col, 8)][0]} form={cells[(col, 8)][1]}")
