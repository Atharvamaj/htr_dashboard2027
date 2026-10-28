#!/bin/bash

# Script to apply the profile creation fix to Supabase database
# This will set up automatic profile creation when users sign up

echo "🔧 Applying profile creation fix..."
echo "This will create a database trigger to automatically create profiles when users sign up."
echo ""

# Check if we have a database URL
if [ -z "$DATABASE_URL" ] && [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️  Warning: No DATABASE_URL or SUPABASE_DB_URL environment variable found."
    echo "You'll need to run this SQL manually in your Supabase SQL editor:"
    echo ""
    echo "📄 SQL file to run: create_profile_trigger.sql"
    echo ""
    echo "Or set your database URL and run this script again:"
    echo "export DATABASE_URL='your_supabase_database_url_here'"
    echo ""
    exit 1
fi

# Use the appropriate database URL
DB_URL="${DATABASE_URL:-$SUPABASE_DB_URL}"

echo "🔄 Connecting to database and applying trigger..."

# Apply the SQL file
if command -v psql &> /dev/null; then
    psql "$DB_URL" -f create_profile_trigger.sql
    echo "✅ Profile creation trigger applied successfully!"
    echo ""
    echo "🎉 Fix complete! New users will now automatically get profiles created."
    echo "💡 The app also has a client-side backup that will create profiles if needed."
else
    echo "❌ psql not found. Please run the SQL manually in your Supabase dashboard:"
    echo ""
    echo "📄 File: create_profile_trigger.sql"
    echo ""
    echo "Or install PostgreSQL client tools and run this script again."
fi