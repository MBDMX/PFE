-- GMAO Platform Schema

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin','manager','technician') NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE machines (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  reference VARCHAR(50),
  location VARCHAR(100),
  status ENUM('operational','maintenance','breakdown') DEFAULT 'operational',
  health_score INT DEFAULT 100,
  last_maintenance DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE work_orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sap_order_id VARCHAR(50),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'corrective',
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(20) DEFAULT 'OPEN',
  technical_location VARCHAR(100),
  equipment_id VARCHAR(50),
  serial_number VARCHAR(100),
  team VARCHAR(100),
  responsible_person VARCHAR(100),
  technician_id INT REFERENCES users(id),
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  time_spent FLOAT,
  work_log TEXT,
  failure_cause TEXT,
  solution_applied TEXT,
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES users(id)
);

CREATE TABLE work_order_parts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  work_order_id INT REFERENCES work_orders(id),
  part_code VARCHAR(50),
  part_name VARCHAR(255),
  quantity INT DEFAULT 1
);

CREATE TABLE stock_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  reference VARCHAR(50),
  quantity INT DEFAULT 0,
  unit VARCHAR(20),
  location VARCHAR(50),
  image VARCHAR(255),
  synonyms TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
