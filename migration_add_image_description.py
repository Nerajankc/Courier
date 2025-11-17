#!/usr/bin/env python3
"""
Migration script to add image_description column to courier_data table.
Run: python migration_add_image_description.py
"""

import sqlite3
import os

DB_PATH = "courier_finder.db"

def migrate():
    """Add image_description column to courier_data table"""
    
    if not os.path.exists(DB_PATH):
        return False
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(courier_data)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'image_description' in columns:
            conn.close()
            return True
        
        # Add the column
        cursor.execute("ALTER TABLE courier_data ADD COLUMN image_description TEXT")
        conn.commit()
        
        # Verify
        cursor.execute("PRAGMA table_info(courier_data)")
        columns = [col[1] for col in cursor.fetchall()]
        success = 'image_description' in columns
        
        conn.close()
        return success
        
    except Exception:
        return False

if __name__ == "__main__":
    success = migrate()
    exit(0 if success else 1)

