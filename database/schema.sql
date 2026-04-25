CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  age INT,
  gender VARCHAR(20),
  bio TEXT,
  profile_picture TEXT,
  chat_theme VARCHAR(50) DEFAULT 'default',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE connections (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  connected_user_id INT REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  sender_id INT REFERENCES users(id),
  receiver_id INT REFERENCES users(id),
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);