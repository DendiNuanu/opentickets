import os
import psycopg2
from dotenv import load_dotenv

# Load env variables
load_dotenv('.env.local')
database_url = os.getenv('DATABASE_URL')

def fix_schema():
    print(f"Connecting to database...")
    try:
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()

        print("Checking/Adding 'attachment_url' to 'messages' table...")
        try:
            cur.execute("ALTER TABLE messages ADD COLUMN attachment_url TEXT;")
            print(" - Added attachment_url")
        except Exception as e:
            if "already exists" in str(e):
                print(" - attachment_url already exists")
            else:
                print(f" - Error adding attachment_url: {e}")

        conn.commit()

        print("Checking/Adding 'attachment_type' to 'messages' table...")
        try:
            cur.execute("ALTER TABLE messages ADD COLUMN attachment_type TEXT;")
            print(" - Added attachment_type")
        except Exception as e:
            if "already exists" in str(e):
                print(" - attachment_type already exists")
            else:
                print(f" - Error adding attachment_type: {e}")

        conn.commit()
        
        # Verify columns
        cur.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'messages'
        """)
        columns = cur.fetchall()
        print("\nCurrent Columns in 'messages':")
        for col in columns:
            print(f" - {col[0]} ({col[1]})")

        cur.close()
        conn.close()
        print("\nSchema fix completed!")
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")

if __name__ == "__main__":
    fix_schema()
