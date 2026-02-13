import os
import psycopg2
from dotenv import load_dotenv

# Load env variables for DATABASE_URL
load_dotenv('.env.local')
database_url = os.getenv('DATABASE_URL')

def check_schema():
    print(f"Connecting to: {database_url.split('@')[1] if '@' in database_url else database_url}")
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        
        # Check columns in messages table
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'messages'
        """)
        
        columns = cur.fetchall()
        print("\nColumns in 'messages' table:")
        for col in columns:
            print(f" - {col[0]} ({col[1]})")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()
