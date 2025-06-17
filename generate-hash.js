// generate-hash.js
import bcrypt from 'bcrypt';

const plainTextPassword = 'Staff1234'; // <-- Change this to the password you want to hash
const saltRounds = 10;

bcrypt.hash(plainTextPassword, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  console.log('Plain Text Password:', plainTextPassword);
  console.log('Bcrypt Hash:', hash);
  console.log('\nCopy this hash and update the password column in your database for the user.');
});