import psycopg2
from psycopg2.extras import RealDictCursor

print("psycopg2 docs say connect() accepts cursor_factory:", 'cursor_factory' in psycopg2.connect.__doc__)
