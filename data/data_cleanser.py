import pandas as pd
import os

# Input and output paths
input_file = "2024_tnea_rank_data.csv"
output_file = "cleansed/2024_tnea_rank_data.csv"

# Ensure output directory exists
os.makedirs(os.path.dirname(output_file), exist_ok=True)

# Load CSV
df = pd.read_csv(input_file)

# List of category columns
category_cols = ['OC', 'BC', 'BCM', 'MBC', 'MBCDNC', 'MBCV', 'SC', 'SCA', 'ST']

# Replace "***" and empty values with 0, then convert to float
df[category_cols] = df[category_cols].replace(["***", "", " "], 0).fillna(0).astype(int)

# Write cleaned CSV
df.to_csv(output_file, index=False)

print(f"✅ Cleaned data written to: {output_file}")