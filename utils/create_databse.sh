#!/bin/bash

# Connect to MongoDB and create database
mongosh <<EOF
use files_manager
EOF

# Insert users with passwords
mongosh <<EOF
use files_manager
db.users.insertMany([
  { name: 'User 1', email: 'user1@example.com', password: 'password1' },
  { name: 'User 2', email: 'user2@example.com', password: 'password2' },
  { name: 'User 3', email: 'user3@example.com', password: 'password3' },
  { name: 'User 4', email: 'user4@example.com', password: 'password4' }
]);
EOF

# Insert files
mongosh <<EOF
use files_manager
var files = [];
for (var i = 1; i <= 30; i++) {
  files.push({ name: 'File ' + i, size: Math.floor(Math.random() * 100) });
}
db.files.insertMany(files);
EOF

