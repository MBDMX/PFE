-- GMAO Platform Schema

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
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
  title VARCHAR(200) NOT NULL,
  machine_id INT REFERENCES machines(id),
  assigned_to INT REFERENCES users(id),
  priority ENUM('low','medium','high','critical') DEFAULT 'medium',
  status ENUM('pending','in_progress','done','cancelled') DEFAULT 'pending',
  description TEXT,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  reference VARCHAR(50),
  quantity INT DEFAULT 0,
  min_quantity INT DEFAULT 5,
  unit VARCHAR(20),
  location VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
