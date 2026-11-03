import sqlite3
conn = sqlite3.connect('db.sqlite3')
tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
print("Tables:", tables)
# Check subject columns
if 'lectures_subject' in tables:
    cols = [r[1] for r in conn.execute("PRAGMA table_info(lectures_subject)").fetchall()]
    print("Subject cols:", cols)
conn.close()

