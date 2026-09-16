-- ==========================================================
-- MESS MANAGEMENT SYSTEM: DATABASE SCHEMA DDL (RAW SQL)
-- Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci | Engine: InnoDB
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. MESSES TABLE
CREATE TABLE IF NOT EXISTS messes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    invite_code VARCHAR(12) NOT NULL UNIQUE,
    address VARCHAR(255) NULL,
    lunch_cutoff_time TIME DEFAULT '09:00:00',
    dinner_cutoff_time TIME DEFAULT '16:00:00',
    created_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_messes_creator FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_mess_code (invite_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. MESS MEMBERS TABLE (TENANCY & ROLES)
CREATE TABLE IF NOT EXISTS mess_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mess_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('MANAGER', 'MEMBER') DEFAULT 'MEMBER',
    status ENUM('PENDING', 'ACTIVE', 'INACTIVE') DEFAULT 'PENDING',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mm_mess FOREIGN KEY (mess_id) REFERENCES messes(id) ON DELETE CASCADE,
    CONSTRAINT fk_mm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_mess_user (mess_id, user_id),
    INDEX idx_mm_status (mess_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BILLING MONTHS (CYCLE CONTROL & HISTORICAL LOCKS)
CREATE TABLE IF NOT EXISTS billing_months (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mess_id INT NOT NULL,
    month_year CHAR(7) NOT NULL, -- Format: 'YYYY-MM'
    status ENUM('OPEN', 'CLOSED') DEFAULT 'OPEN',
    final_meal_rate DECIMAL(10, 4) DEFAULT 0.0000,
    closed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bm_mess FOREIGN KEY (mess_id) REFERENCES messes(id) ON DELETE CASCADE,
    UNIQUE KEY uq_mess_month (mess_id, month_year),
    INDEX idx_bm_lookup (mess_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. DAILY MEALS TABLE
CREATE TABLE IF NOT EXISTS meals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mess_id INT NOT NULL,
    user_id INT NOT NULL,
    meal_date DATE NOT NULL,
    breakfast_count DECIMAL(4, 2) DEFAULT 0.00,
    lunch_count DECIMAL(4, 2) DEFAULT 0.00,
    dinner_count DECIMAL(4, 2) DEFAULT 0.00,
    total_meals DECIMAL(5, 2) GENERATED ALWAYS AS (breakfast_count + lunch_count + dinner_count) STORED,
    updated_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_meals_mess FOREIGN KEY (mess_id) REFERENCES messes(id) ON DELETE CASCADE,
    CONSTRAINT fk_meals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_meals_updater FOREIGN KEY (updated_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_member_meal_date (mess_id, user_id, meal_date),
    INDEX idx_meals_query (mess_id, meal_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. EXPENSES (BAZAR & SHARED FIXED)
CREATE TABLE IF NOT EXISTS expenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mess_id INT NOT NULL,
    billing_month_id INT NOT NULL,
    category ENUM('BAZAR', 'SHARED_FIXED') NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    paid_by_user_id INT NOT NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'APPROVED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_exp_mess FOREIGN KEY (mess_id) REFERENCES messes(id) ON DELETE CASCADE,
    CONSTRAINT fk_exp_month FOREIGN KEY (billing_month_id) REFERENCES billing_months(id) ON DELETE RESTRICT,
    CONSTRAINT fk_exp_payer FOREIGN KEY (paid_by_user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_expenses_filter (mess_id, billing_month_id, category, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. DEPOSITS TABLE
CREATE TABLE IF NOT EXISTS deposits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mess_id INT NOT NULL,
    billing_month_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    deposit_date DATE NOT NULL,
    payment_method ENUM('CASH', 'BKASH', 'NAGAD', 'BANK', 'OTHER') DEFAULT 'CASH',
    transaction_ref VARCHAR(100) NULL,
    notes VARCHAR(255) NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_dep_mess FOREIGN KEY (mess_id) REFERENCES messes(id) ON DELETE CASCADE,
    CONSTRAINT fk_dep_month FOREIGN KEY (billing_month_id) REFERENCES billing_months(id) ON DELETE RESTRICT,
    CONSTRAINT fk_dep_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_deposits_filter (mess_id, billing_month_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. MONTHLY SETTLEMENTS (IMMUTABLE AUDIT LOG)
CREATE TABLE IF NOT EXISTS monthly_settlements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    billing_month_id INT NOT NULL,
    mess_id INT NOT NULL,
    user_id INT NOT NULL,
    total_meals DECIMAL(6, 2) NOT NULL,
    meal_rate DECIMAL(10, 4) NOT NULL,
    meal_cost DECIMAL(10, 2) NOT NULL,
    fixed_cost_share DECIMAL(10, 2) NOT NULL,
    total_deposits DECIMAL(10, 2) NOT NULL,
    opening_balance DECIMAL(10, 2) DEFAULT 0.00,
    closing_balance DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_settle_month FOREIGN KEY (billing_month_id) REFERENCES billing_months(id) ON DELETE CASCADE,
    CONSTRAINT fk_settle_mess FOREIGN KEY (mess_id) REFERENCES messes(id) ON DELETE CASCADE,
    CONSTRAINT fk_settle_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_settle_member (billing_month_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
