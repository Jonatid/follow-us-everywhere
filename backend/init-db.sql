-- Create database (if not exists)
-- This script should be run as a superuser
-- ALTER SYSTEM SET max_connections = 100;

-- Create database
CREATE DATABASE linktree_db;

-- Connect to the new database
\c linktree_db;

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    business_description TEXT,
    profile_image_url VARCHAR(500),
    bio VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create social_links table
CREATE TABLE IF NOT EXISTS social_links (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    platform VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    display_name VARCHAR(255),
    icon_url VARCHAR(500),
    position INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_businesses_username ON businesses(username);
CREATE INDEX idx_businesses_email ON businesses(email);
CREATE INDEX idx_social_links_business_id ON social_links(business_id);
CREATE INDEX idx_social_links_platform ON social_links(platform);

-- Insert sample data (optional)
-- INSERT INTO businesses (username, email, password_hash, business_name, business_description, bio)
-- VALUES ('businessuser', 'business@example.com', 'hashed_password', 'My Business', 'A great business', 'Welcome to my profile');
