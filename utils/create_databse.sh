#!/bin/bash

# Connect to MongoDB and create database
mongosh <<EOF
use file_manager
EOF

# Insert users
mongosh <<EOF
use file_manager
db.users.insertMany([
  { name: 'User 1', email: 'user1@example.com' },
  { name: 'User 2', email: 'user2@example.com' },
  { name: 'User 3', email: 'user3@example.com' },
  { name: 'User 4', email: 'user4@example.com' }
]);
EOF

# Insert files
mongosh <<EOF
use file_manager
var files = [];
for (var i = 1; i <= 30; i++) {
  files.push({ name: 'File ' + i, size: Math.floor(Math.random() * 100) });
}
db.files.insertMany(files);
EOF

