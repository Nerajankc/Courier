#!/usr/bin/env python3
"""
Migration script to add image_description column to courier_data table.
This column stores AI-generated descriptions from customer search images.

Run this script once to update your existing database:
    python migration_add_image_description.py
"""

import sqlite3
import os

# Database path
DB_PATH = "courier_finder.db"

def migrate():
    """Add image_description column to courier_data table"""
    
    if not os.path.exists(DB_PATH):
        print(f"Error: Database file '{DB_PATH}' not found!")
        print("Make sure you're running this script from the project root directory.")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if the column already exists
        cursor.execute("PRAGMA table_info(courier_data)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'image_description' in columns:
            print("✓ Column 'image_description' already exists in courier_data table.")
            print("  No migration needed.")
            conn.close()
            return True
        
        # Add the new column
        print("Adding 'image_description' column to courier_data table...")
        cursor.execute("""
            ALTER TABLE courier_data 
            ADD COLUMN image_description TEXT
        """)
        
        conn.commit()
        print("✓ Successfully added 'image_description' column!")
        print("  This column will store AI descriptions from customer search images.")
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(courier_data)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'image_description' in columns:
            print("✓ Migration verified successfully!")
        else:
            print("✗ Warning: Column was not added properly.")
            conn.close()
            return False
        
        conn.close()
        return True
        
    except sqlite3.Error as e:
        print(f"✗ Database error: {e}")
        return False
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("Database Migration: Add image_description column")
    print("=" * 60)
    print()
    
    success = migrate()
    
    print()
    if success:
        print("=" * 60)
        print("Migration completed successfully!")
        print("=" * 60)
        print()
        print("What's new:")
        print("  • Customers can now upload images when searching for lost items")
        print("  • AI will analyze customer images and use them for matching")
        print("  • The image_description field stores these AI descriptions")
        print()
    else:
        print("=" * 60)
        print("Migration failed!")
        print("=" * 60)
        print()
        print("Please check the error messages above and try again.")
        print()

