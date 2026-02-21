-- Create database (if not exists)
-- This script should be run as a superuser
-- ALTER SYSTEM SET max_connections = 100;

-- Create database
CREATE DATABASE followuseverywhere-db;

-- Connect to the new database
\c followuseverywhere-db;

-- Create businesses table
CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    tagline VARCHAR(255) DEFAULT '',
    logo VARCHAR(10) DEFAULT '',
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    suspended_reason TEXT,
    verification_status TEXT NOT NULL DEFAULT 'active',
    suspended_at TIMESTAMP,
    disabled_at TIMESTAMP,
    last_nudge_at TIMESTAMP,
    nudge_message TEXT,
    policy_violation_code TEXT,
    policy_violation_text TEXT,
    community_support_text TEXT,
    community_support_links JSONB,
    mission_statement TEXT,
    vision_statement TEXT,
    philanthropic_goals TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create social_links table
CREATE TABLE IF NOT EXISTS social_links (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    platform VARCHAR(100) NOT NULL,
    url VARCHAR(500) NOT NULL,
    icon VARCHAR(10) DEFAULT '',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255) NOT NULL DEFAULT '',
    last_name VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customer favorites table
CREATE TABLE IF NOT EXISTS customer_favorites (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (customer_id, business_id)
);

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Create customer password reset tokens table
CREATE TABLE IF NOT EXISTS customer_password_resets (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create badges table
CREATE TABLE IF NOT EXISTS badges (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create business badges table
CREATE TABLE IF NOT EXISTS business_badges (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    evidence_url TEXT,
    notes TEXT,
    awarded_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    UNIQUE (business_id, badge_id)
);

-- Create indexes for better performance
CREATE INDEX idx_businesses_slug ON businesses(slug);
CREATE INDEX idx_businesses_email ON businesses(email);
CREATE INDEX idx_social_links_business_id ON social_links(business_id);
CREATE INDEX idx_social_links_platform ON social_links(platform);
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_business_badges_business_id ON business_badges(business_id);
CREATE INDEX idx_business_badges_badge_id ON business_badges(badge_id);
CREATE INDEX idx_customer_favorites_customer_id ON customer_favorites(customer_id);
CREATE INDEX idx_customer_favorites_business_id ON customer_favorites(business_id);
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_business_id ON password_reset_tokens(business_id);
CREATE INDEX idx_customer_password_resets_token_hash ON customer_password_resets(token_hash);
CREATE INDEX idx_customer_password_resets_customer_id ON customer_password_resets(customer_id);

-- Insert sample data (optional)
-- INSERT INTO businesses (username, email, password_hash, business_name, business_description, bio)
-- VALUES ('businessuser', 'business@example.com', 'hashed_password', 'My Business', 'A great business', 'Welcome to my profile');
