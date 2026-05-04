// Database connection utilities
// Note: This module is designed for server-side use only
// Browser compatibility is limited to interface definitions

export interface DatabaseConfig {
  type: 'mysql' | 'postgresql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

export class DatabaseManager {
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async testConnection(): Promise<boolean> {
    // Check if running in browser environment
    if (typeof window !== 'undefined') {
      throw new Error('Database operations are not supported in browser environment. This functionality requires a server-side environment.');
    }

    try {
      if (this.config.type === 'mysql') {
        // Dynamic import to prevent browser bundling issues
        const mysql = await import('mysql2/promise');
        const connection = await mysql.createConnection({
          host: this.config.host,
          port: this.config.port,
          user: this.config.username,
          password: this.config.password,
          database: this.config.database,
          ssl: this.config.ssl
        });
        await connection.ping();
        await connection.end();
        return true;
      } else {
        // Dynamic import to prevent browser bundling issues
        const { Client } = await import('pg');
        const client = new Client({
          host: this.config.host,
          port: this.config.port,
          user: this.config.username,
          password: this.config.password,
          database: this.config.database,
          ssl: this.config.ssl
        });
        await client.connect();
        await client.query('SELECT 1');
        await client.end();
        return true;
      }
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  async initializeDatabase(): Promise<void> {
    // Check if running in browser environment
    if (typeof window !== 'undefined') {
      throw new Error('Database operations are not supported in browser environment. This functionality requires a server-side environment.');
    }

    if (this.config.type === 'mysql') {
      await this.initializeMySQLTables();
    } else {
      await this.initializePostgreSQLTables();
    }
  }

  private async initializeMySQLTables(): Promise<void> {
    // Dynamic import to prevent browser bundling issues
    const mysql = await import('mysql2/promise');
    const connection = await mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl
    });

    try {
      // Create users table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          role ENUM('admin', 'partner', 'manager', 'submitter') NOT NULL,
          organization VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_login TIMESTAMP NULL
        )
      `);

      // Create partners table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS partners (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          contact_email VARCHAR(255) NOT NULL,
          contact_phone VARCHAR(50),
          address TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          assigned_manager_id VARCHAR(36),
          FOREIGN KEY (assigned_manager_id) REFERENCES users(id)
        )
      `);

      // Create programs table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS programs (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          partner_id VARCHAR(36) NOT NULL,
          form_template_id VARCHAR(36),
          budget DECIMAL(15,2) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          manager_id VARCHAR(36),
          FOREIGN KEY (partner_id) REFERENCES partners(id),
          FOREIGN KEY (manager_id) REFERENCES users(id)
        )
      `);

      // Create projects table
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS projects (
          id VARCHAR(36) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          status ENUM('draft', 'submitted', 'under_review', 'pre_selected', 'selected', 'formalization', 'financed', 'monitoring', 'closed', 'rejected') NOT NULL,
          budget DECIMAL(15,2) NOT NULL,
          timeline VARCHAR(100) NOT NULL,
          submitter_id VARCHAR(36) NOT NULL,
          program_id VARCHAR(36) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          submission_date TIMESTAMP NULL,
          evaluation_scores JSON,
          total_evaluation_score INT,
          evaluation_notes TEXT,
          evaluated_by VARCHAR(36),
          evaluation_date TIMESTAMP NULL,
          formalization_completed BOOLEAN DEFAULT FALSE,
          nda_signed BOOLEAN DEFAULT FALSE,
          tags JSON,
          form_data JSON,
          FOREIGN KEY (submitter_id) REFERENCES users(id),
          FOREIGN KEY (program_id) REFERENCES programs(id),
          FOREIGN KEY (evaluated_by) REFERENCES users(id)
        )
      `);

      console.log('MySQL tables created successfully');
    } finally {
      await connection.end();
    }
  }

  private async initializePostgreSQLTables(): Promise<void> {
    // Dynamic import to prevent browser bundling issues
    const { Client } = await import('pg');
    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl
    });

    try {
      await client.connect();

      // Create ENUM types
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('admin', 'partner', 'manager', 'submitter');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await client.query(`
        DO $$ BEGIN
          CREATE TYPE project_status AS ENUM ('draft', 'submitted', 'under_review', 'pre_selected', 'selected', 'formalization', 'financed', 'monitoring', 'closed', 'rejected');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          role user_role NOT NULL,
          organization VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          last_login TIMESTAMPTZ
        )
      `);

      // Create partners table
      await client.query(`
        CREATE TABLE IF NOT EXISTS partners (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          contact_email VARCHAR(255) NOT NULL,
          contact_phone VARCHAR(50),
          address TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          assigned_manager_id UUID REFERENCES users(id)
        )
      `);

      // Create programs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS programs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          partner_id UUID NOT NULL REFERENCES partners(id),
          form_template_id UUID,
          budget DECIMAL(15,2) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          manager_id UUID REFERENCES users(id)
        )
      `);

      // Create projects table
      await client.query(`
        CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          status project_status NOT NULL,
          budget DECIMAL(15,2) NOT NULL,
          timeline VARCHAR(100) NOT NULL,
          submitter_id UUID NOT NULL REFERENCES users(id),
          program_id UUID NOT NULL REFERENCES programs(id),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          submission_date TIMESTAMPTZ,
          evaluation_scores JSONB,
          total_evaluation_score INTEGER,
          evaluation_notes TEXT,
          evaluated_by UUID REFERENCES users(id),
          evaluation_date TIMESTAMPTZ,
          formalization_completed BOOLEAN DEFAULT FALSE,
          nda_signed BOOLEAN DEFAULT FALSE,
          tags JSONB,
          form_data JSONB
        )
      `);

      console.log('PostgreSQL tables created successfully');
    } finally {
      await client.end();
    }
  }

  async resetDatabase(): Promise<void> {
    // Check if running in browser environment
    if (typeof window !== 'undefined') {
      throw new Error('Database operations are not supported in browser environment. This functionality requires a server-side environment.');
    }

    if (this.config.type === 'mysql') {
      await this.resetMySQLDatabase();
    } else {
      await this.resetPostgreSQLDatabase();
    }
  }

  private async resetMySQLDatabase(): Promise<void> {
    // Dynamic import to prevent browser bundling issues
    const mysql = await import('mysql2/promise');
    const connection = await mysql.createConnection({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl
    });

    try {
      // Disable foreign key checks
      await connection.execute('SET FOREIGN_KEY_CHECKS = 0');
      
      // Drop tables
      await connection.execute('DROP TABLE IF EXISTS projects');
      await connection.execute('DROP TABLE IF EXISTS programs');
      await connection.execute('DROP TABLE IF EXISTS partners');
      await connection.execute('DROP TABLE IF EXISTS users');
      
      // Re-enable foreign key checks
      await connection.execute('SET FOREIGN_KEY_CHECKS = 1');
      
      // Recreate tables
      await this.initializeMySQLTables();
      
      console.log('MySQL database reset successfully');
    } finally {
      await connection.end();
    }
  }

  private async resetPostgreSQLDatabase(): Promise<void> {
    // Dynamic import to prevent browser bundling issues
    const { Client } = await import('pg');
    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      user: this.config.username,
      password: this.config.password,
      database: this.config.database,
      ssl: this.config.ssl
    });

    try {
      await client.connect();
      
      // Drop tables
      await client.query('DROP TABLE IF EXISTS projects CASCADE');
      await client.query('DROP TABLE IF EXISTS programs CASCADE');
      await client.query('DROP TABLE IF EXISTS partners CASCADE');
      await client.query('DROP TABLE IF EXISTS users CASCADE');
      
      // Drop types
      await client.query('DROP TYPE IF EXISTS project_status CASCADE');
      await client.query('DROP TYPE IF EXISTS user_role CASCADE');
      
      // Recreate tables
      await this.initializePostgreSQLTables();
      
      console.log('PostgreSQL database reset successfully');
    } finally {
      await client.end();
    }
  }
}