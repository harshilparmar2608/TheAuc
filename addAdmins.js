const https = require('https');

const data1 = JSON.stringify({
  username: "Sujal0612",
  password: "9016502072",
  role: "admin",
  createdAt: Date.now()
});

const data2 = JSON.stringify({
  username: "Het1611",
  password: "7046761343",
  role: "admin",
  createdAt: Date.now()
});

const options = {
  hostname: 'gjplauction-default-rtdb.firebaseio.com',
  port: 443,
  path: '/admins.json',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  }
};

const req1 = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});
req1.write(data1);
req1.end();

const req2 = https.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});
req2.write(data2);
req2.end();
