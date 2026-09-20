import pandas as pd

# Read the excel file
df = pd.read_excel('sample/ridwan 2.xlsx')

# Try to match the dummy_data CSV format if possible:
# Tanggal,Waktu,T1,H1,T2,H2,T3,H3,T4,H4,T5,H5,T6,H6,T7,H7,T8,H8,T9,H9,T10,H10
output_path = 'react-dashboard/public/dummy_data.csv'
df.to_csv(output_path, index=False)
print(f"Successfully converted to {output_path}")
