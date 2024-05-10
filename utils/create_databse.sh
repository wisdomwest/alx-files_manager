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
var types = ['folder', 'file', 'image'];
var base64Data = 'SGVsbG8gV2Vic3RhY2shCg=='; // Placeholder for actual Base64 data

for (var i = 1; i <= 10; i++) {
  var typeIndex = Math.floor(Math.random() * types.length);
  var fileType = types[typeIndex];
  
  var fileObject = {
    name: 'File ' + i,
    type: fileType,
    parentId: '0', // Default parent ID is 0 for the root
    isPublic: false // Default isPublic is false
  };
  
  if (fileType === 'file' || fileType === 'image') {
    fileObject.data = base64Data; // Assign Base64 data for file/image types
  }
  
  files.push(fileObject);
}

db.files.insertMany(files);
EOF

# Insert files
mongosh <<EOF
use files_manager
var files = [];
var types = ['folder', 'file', 'image'];
var base64Data = 'SGVsbG8gV2Vic3RhY2shCg=='; // Placeholder for actual Base64 data

for (var i = 1; i <= 20; i++) {
  var typeIndex = Math.floor(Math.random() * types.length);
  var fileType = types[typeIndex];
  
  var fileObject = {
    name: 'File ' + i,
    type: fileType,
    parentId: '7ba1cb98-6b68-435a-9068-0e47f5e67017', // Default parent ID is 0 for the root
    isPublic: false // Default isPublic is false
  };
  
  if (fileType === 'file' || fileType === 'image') {
    fileObject.data = base64Data; // Assign Base64 data for file/image types
  }
  
  files.push(fileObject);
}

db.files.insertMany(files);
EOF


