import pandas as pd
import json

file_path = '/Users/ryanrichard/projecont/Rayo/temp/braga/dados validados/RCO005_PlanoConta (1).xlsx'

try:
    df = pd.read_excel(file_path)
    
    mappings = {}
    found_count = 0
    
    # Heurística: procurar em todas as linhas e colunas
    for index, row in df.iterrows():
        fortes_acc = None
        dealer_acc = None
        
        for col in df.columns:
            val = str(row[col]).strip()
            
            # Formato Fortes: X.X.X.XX.XXX
            if len(val.split('.')) >= 4 and all(part.isdigit() for part in val.split('.')):
                fortes_acc = val
            
            # Formato Dealer: 12 dígitos
            if len(val) == 12 and val.isdigit():
                dealer_acc = val
        
        if fortes_acc and dealer_acc:
            mappings[fortes_acc] = dealer_acc
            found_count += 1
            
    print("--- MAPA ENCONTRADO ---")
    print(f"Total: {found_count}")
    print(json.dumps(mappings, indent=2))
    
except Exception as e:
    print(f"Erro ao ler excel: {e}")
