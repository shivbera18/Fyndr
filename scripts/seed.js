// Fyndr seed — Demo event + wedding.jpg
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const API = process.env.API_URL || 'http://127.0.0.1:5000';
(async()=>{
  const email=`seed_${Date.now()}@fyndr.in`;
  let r=await axios.post(`${API}/register`,{name:'Seed',email,password:'seed123'});
  console.log('register',r.data);
  r=await axios.post(`${API}/login`,{email,password:'seed123'});
  const userId=r.data._id; console.log('login',userId);
  r=await axios.post(`${API}/event`,{event_name:'Demo Seeded',created_id:userId,pin:'123456'});
  const eventId=r.data._id; console.log('event',eventId);
  const img=path.join(__dirname,'../front-end/public/images/wedding.jpg');
  const fd=new FormData();
  fd.append('name',fs.createReadStream(img));
  fd.append('event_id',eventId);
  fd.append('upload_by',userId);
  r=await axios.post(`${API}/photo`,fd,{headers:fd.getHeaders(),maxContentLength:Infinity,maxBodyLength:Infinity});
  console.log('upload',r.data.length,'photos');
  console.log(`Guest: http://localhost:3000/collect/${eventId} PIN 123456`);
})();
