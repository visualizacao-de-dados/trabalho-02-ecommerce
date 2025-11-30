import requests
import os


API_URL = "https://data.cityofchicago.org/resource/ijzp-q8t2.csv?$query=SELECT%0A%20%20%60id%60%2C%0A%20%20%60case_number%60%2C%0A%20%20%60date%60%2C%0A%20%20%60block%60%2C%0A%20%20%60iucr%60%2C%0A%20%20%60primary_type%60%2C%0A%20%20%60description%60%2C%0A%20%20%60location_description%60%2C%0A%20%20%60arrest%60%2C%0A%20%20%60domestic%60%2C%0A%20%20%60beat%60%2C%0A%20%20%60district%60%2C%0A%20%20%60ward%60%2C%0A%20%20%60community_area%60%2C%0A%20%20%60fbi_code%60%2C%0A%20%20%60x_coordinate%60%2C%0A%20%20%60y_coordinate%60%2C%0A%20%20%60year%60%2C%0A%20%20%60updated_on%60%2C%0A%20%20%60latitude%60%2C%0A%20%20%60longitude%60%2C%0A%20%20%60location%60%0AWHERE%0A%20%20%60date%60%0A%20%20%20%20BETWEEN%20%222018-01-01T14%3A41%3A55%22%20%3A%3A%20floating_timestamp%0A%20%20%20%20AND%20%222024-12-31T14%3A41%3A55%22%20%3A%3A%20floating_timestamp%0AORDER%20BY%20%60date%60%20DESC%20NULL%20FIRST"
OUTPUT_DIR = "dados"
OUTPUT_FILENAME = "crimes_chicago.csv"
FULL_PATH = os.path.join(OUTPUT_DIR, OUTPUT_FILENAME)

def baixar_e_salvar_dados():
    
    print(f"🔗 Iniciando o download...")
    
    try:

        response = requests.get(API_URL, stream=True)
        
        response.raise_for_status()
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Erro ao fazer a requisição: {e}")
        return

    try:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        print(f"📂 Diretório criado (ou já existente): '{OUTPUT_DIR}'")
    except OSError as e:
        print(f"❌ Erro ao criar o diretório '{OUTPUT_DIR}': {e}")
        return

    try:
        with open(FULL_PATH, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
        
        print(f"✅ Dados salvos com sucesso em: {FULL_PATH}")
        
    except IOError as e:
        print(f"❌ Erro ao salvar o arquivo: {e}")

if __name__ == "__main__":
    baixar_e_salvar_dados()