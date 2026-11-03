import sqlite3
conn = sqlite3.connect('db.sqlite3')
rows = conn.execute("SELECT app, name FROM django_migrations ORDER BY app, name").fetchall()
for r in rows:
    print(r)
conn.close()

