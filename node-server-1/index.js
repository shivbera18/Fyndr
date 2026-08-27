
require('dotenv').config();

const mongoose = require("mongoose")

const express = require("express");
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const cors = require("cors")
const User = require("./models/User.models")
const Event = require("./models/Event.models")
const Photo = require("./models/Photo.models")
const Studio = require("./models/Studio.models")
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
const crypto = require('crypto');
const { client: promClient, httpRequests, uploadDuration, faceSearchDuration } = require('./metrics');
const { enqueue, stats: queueStats } = require('./queue/mongoQueue');
const { getPresignedPut } = require('./utils/r2');
const pLimit = require('p-limit');
const logger = require('./utils/logger');
require("./Config_db")





const app = express();

app.use(express.json());
app.use(cors());
// P2: metrics middleware – normalized route, no high-cardinality req.path, with duration histogram
app.use((req,res,next)=>{
  const start = Date.now();
  const origEnd = res.end;
  res.end = function(...args){
    // Prefer matched route, fallback to path without query/id to avoid cardinality explosion
    let route = 'unknown';
    if (req.route && req.route.path) route = req.route.path;
    else if (req.path) route = req.path.replace(/\/[a-f0-9]{24}/gi, '/:id').split('?')[0] || 'unknown';
    const elapsed = (Date.now() - start) / 1000;
    try { httpRequests.inc({ method: req.method, route, status: res.statusCode }); } catch(_){}
    // Optionally observe via uploadDuration/faceSearchDuration elsewhere; keep generic timing available
    return origEnd.apply(this, args);
  };
  next();
});

//----------------------------------------------------------------------------
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
}

let otpStorage = {}; // In-memory store to map email -> OTP

//-----------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_fyndr_local';
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use your Gmail app password here
    },
});


const UPLOAD_DIR = path.join(__dirname, 'uploads');
const EVENT_PROFILE_DIR = path.join(__dirname, 'event_profile');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(EVENT_PROFILE_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
    },
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB size limit
    fileFilter: (req, file, cb) => {
        // Allow only image files
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    },
});
const storage2 = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, EVENT_PROFILE_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
    },
});
const event_profile_up = multer({
    storage: storage2,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB size limit
    fileFilter: (req, file, cb) => {
        // Allow only image files
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    },
});

app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/event_profile', express.static(EVENT_PROFILE_DIR));

app.post("/register", async (req, resp) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return resp.status(400).send({ message: "All details are required" });
        }

        const user = new User({ name, email, password, isVerified: true });
        const result = await user.save();

        // Generate a JWT token for verification
        const token = jwt.sign({ userId: result._id }, JWT_SECRET, { expiresIn: '1h' });

        // Send verification email (skip if dummy)
        const verificationLink = `http://localhost:5000/verify/${token}`;
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Verification',
                html: `<p>Hello ${name},</p><p>Please verify your email by clicking the link below:</p><br/><a href="${verificationLink}">Verify Email</a>`,
            });
        } catch(e){ logger.warn('Email skipped (local dev)', { error: e.message, email })}
        logger.info('User registered', { email, userId: result._id });
        resp.send({ message: "Registration successful! Please verify your email." });
    } catch (error) {
        logger.error('Registration failed', { error: error.message, stack: error.stack, email: req.body?.email });
        if (error.code === 11000 && error.keyPattern.email) {
            resp.status(400).send({ message: 'Email already exists' });
        } else {
            resp.status(500).send({ message: 'An unexpected error occurred' });
        }
    }
});

//---------------------------------------------------------------------------------------------------------------------

app.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = jwt.verify(token, JWT_SECRET);

        // Mark the user as verified
        const user = await User.findByIdAndUpdate(decoded.userId, { isVerified: true }, { new: true });

        if (user) {
            res.redirect('http://localhost:3000/confirmed?status=success');
        } else {
            res.redirect('http://localhost:3000/confirmed?status=failed');
        }
    } catch (error) {
        res.redirect('http://localhost:3000/confirmed?status=failed');
    }
});
//-----------------------------------------------------------------------------------------------------------------

// Example: Backend endpoint to check email verification status
app.post("/check-verification", async (req, res) => {
    const { email, password } = req.body;
    let user = await User.findOne({ email, password });

    if (!user) {
        return res.status(404).send({ message: 'User not found' });
    }

    // Assuming the user model has an `isVerified` field
    if (user.isVerified) {
        const { name, _id } = user
        user = { name, _id }
        return res.send(user);
    }

    res.send({ message: "Not verified!!!", verified: false });
});


//-----------------------------------------------------------------------------------------------------------------


app.post('/resend-verification', async (req, resp) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return resp.status(404).send({ message: 'User not found.' });
        }

        if (user.isVerified) {
            return resp.status(400).send({ message: 'User is already verified.' });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

        const verificationLink = `http://localhost:3000/verify/${token}?email=${email}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Resend: Verify your Email',
            html: `<p>Hello ${user.name},</p>
                   <p>Please verify your email by clicking the link below:</p>
                   <a href="${verificationLink}">Verify Email</a>`,
        });

        resp.send({ message: 'Verification email has been resent.' });
    } catch (error) {
        logger.error(error);
        resp.status(500).send({ message: 'Failed to resend the verification email.' });
    }
});




//-------------------------------------------------------------------------------------------------------------------

app.post("/login", async (req, resp) => {
    const { email, password } = req.body || {};
    if (email && password) {
        try {
            const user = await User.findOne({ email: String(email).trim(), password: String(password) }).select("name");
            if (user) {
                resp.status(200).send(user);
            } else {
                resp.status(404).send({ message: 'Invalid email or password' });
            }
        } catch (error) {
            logger.error('[login]', error);
            resp.status(500).send({ message: 'Internal server error' });
        }
    } else {
        resp.status(400).send({ message: "Email and password are required" });
    }
});

//--------------------------------------------------------------------------------------------------------------------

app.post("/event", event_profile_up.any(), async (req, resp) => {
    const { event_name, created_id, pin } = req.body || {};
    if (event_name && created_id) {
        try {
            const userCheck = await User.findById(created_id);
            if (userCheck) {
                const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : (req.file || null);
                const event = new Event({
                    event_name: String(event_name).trim(),
                    pin: pin ? String(pin).trim() : '123456',
                    created_id,
                    event_photo: uploadedFile ? uploadedFile.filename : null
                });

                const result = await event.save();
                if (result) {
                    const { event_name: eName, _id, event_photo } = result;
                    resp.status(200).send({ event_name: eName, _id, event_photo, pin: result.pin });
                } else {
                    resp.status(500).send({ result: "Failed to create event" });
                }
            } else {
                resp.status(404).send({ result: "User account is not valid or not available" });
            }
        } catch (error) {
            resp.status(500).send({ result: "An error occurred", error: error.message });
        }
    } else {
        resp.status(400).send({ result: "Event name and created_id are required" });
    }
});


//-------------------------------------------------------------------------------------------------------------------

app.post("/display_event", async (req, resp) => {
    try {
        const { userId } = req.body || {};
        if (userId) {
            const events = await Event.find({ created_id: userId }).sort({ createdAt: -1 });
            resp.status(200).send(events || []);
        } else {
            resp.status(400).send({ message: "User ID is required" });
        }
    } catch (error) {
        logger.error("Error retrieving events:", error);
        resp.status(500).send({ message: "An error occurred while retrieving events" });
    }
});

app.post('/in-event', async (req, resp) => {
    const { _id } = req.body || {};
    if (!_id) {
        return resp.status(400).send({ result: "Event ID is required" });
    }

    try {
        const result = await Photo.find({ event_id: _id }).sort({ createdAt: -1 });
        resp.status(200).send(result || []);
    } catch (error) {
        resp.status(500).send({ result: "An error occurred while retrieving images", error: error.message });
    }
});



//---------------------------------------------------------------------------------------------------------

app.post('/photo', upload.array('name', 100), async (req, res) => {
    const endTimer = uploadDuration.startTimer();
    try {
        const files = req.files || [];
        const { event_id, upload_by } = req.body;
        if (!event_id) return res.status(400).send({ error: 'event_id required' });
        if (!mongoose.Types.ObjectId.isValid(event_id)) return res.status(400).send({ error: 'invalid event_id' });
        if (files.length === 0) return res.status(400).send({ error: 'no files uploaded' });
        const eventExists = await Event.findById(event_id).select('_id');
        if (!eventExists) return res.status(404).send({ error: 'event not found' });

        const limit = pLimit(6);
        const queueMod = require('./queue/mongoQueue');

        const results = await Promise.all(
            files.map(file => limit(async () => {
                let hash;
                try {
                    // non-blocking streaming hash (avoid fs.readFileSync blocking event loop)
                    hash = await new Promise((resolve, reject) => {
                        const h = crypto.createHash('sha256');
                        const s = fs.createReadStream(file.path);
                        s.on('error', reject);
                        s.on('data', d => h.update(d));
                        s.on('end', () => resolve(h.digest('hex')));
                    });
                } catch (e) {
                    return { file: file.originalname, error: 'hash failed: ' + e.message, status: 'failed' };
                }

                // Per-event idempotency: check Photo first (fast path)
                try {
                    const existingPhoto = await Photo.findOne({ event_id, hash });
                    if (existingPhoto) {
                        try { fs.unlinkSync(file.path); } catch(_){}
                        await queueMod.markDone(event_id, hash).catch(()=>{});
                        return existingPhoto;
                    }
                } catch(_){}

                const q = await enqueue(event_id, hash, file.filename);
                if (q && q.status === 'done') {
                    try { fs.unlinkSync(file.path); } catch(_){}
                    const existing = await Photo.findOne({ event_id, hash });
                    return existing || { file: file.originalname, hash, status: 'duplicate', photo_id: q.photo_hash };
                }

                // Pre-generate photoId so we can index FAISS in single ML call
                const photoId = new mongoose.Types.ObjectId();
                const formData = new FormData();
                formData.append('image', fs.createReadStream(file.path));
                formData.append('event_id', event_id);
                formData.append('photo_id', photoId.toString());

                let embeddings = [];
                try {
                    const response = await axios.post('http://127.0.0.1:5001/get_embedding', formData, {
                        headers: { ...formData.getHeaders() },
                        maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 60000
                    });
                    if (response.data.error) throw new Error(response.data.error);
                    if (Array.isArray(response.data.embeddings)) {
                        embeddings = response.data.embeddings;
                    } else if (Array.isArray(response.data.embedding)) {
                        embeddings = [response.data.embedding];
                    }
                } catch (e) {
                    await queueMod.markFailed(event_id, hash, e.message).catch(()=>{});
                    try { fs.unlinkSync(file.path); } catch(_){}
                    return { file: file.originalname, hash, error: e.message, status: 'failed' };
                }

                try {
                    const photo = new Photo({
                        _id: photoId,
                        name: file.filename,
                        event_id, upload_by,
                        embedding: JSON.stringify(embeddings),
                        hash, status: 'done'
                    });
                    await photo.save();
                    await queueMod.markDone(event_id, hash).catch(()=>{});
                    return photo;
                } catch (e) {
                    if (e.code === 11000) {
                        // race: another worker saved same hash — clean orphan FAISS vector
                        try { fs.unlinkSync(file.path); } catch(_){}
                        try { await axios.post('http://127.0.0.1:5001/faiss_remove', { event_id, photo_id: photoId.toString() }, { timeout: 3000 }); } catch(_){}
                        const dup = await Photo.findOne({ event_id, hash });
                        await queueMod.markDone(event_id, hash).catch(()=>{});
                        return dup || { file: file.originalname, hash, error: 'duplicate', status: 'duplicate' };
                    }
                    // on generic save failure, also try to clean orphan FAISS
                    try { await axios.post('http://127.0.0.1:5001/faiss_remove', { event_id, photo_id: photoId.toString() }, { timeout: 3000 }); } catch(_){}
                    await queueMod.markFailed(event_id, hash, e.message).catch(()=>{});
                    return { file: file.originalname, hash, error: e.message, status: 'failed' };
                }
            }))
        );

        const failed = results.filter(r => r && r.error);
        endTimer();
        // 207 Multi-Status if partial failures, 200 if all ok
        if (failed.length > 0 && failed.length < results.length) return res.status(207).send(results);
        if (failed.length === results.length) return res.status(422).send(results);
        res.status(200).send(results);
    } catch (error) {
        logger.error('[photo] upload error', error);
        endTimer();
        res.status(500).json({ result: 'An error occurred while uploading images', error: error.message });
    }
});

//---------------------------------------------------------------------------------------------------

app.delete('/delete-event', async (req, res) => {
    try {
        const { _id } = req.body;
        if (!_id) return res.status(400).send({ message: "Event is Missing! Please Reload" });
        if (!mongoose.Types.ObjectId.isValid(_id)) return res.status(400).send({ message: "Invalid Event ID" });

        const event = await Event.findByIdAndDelete(new mongoose.Types.ObjectId(_id));
        if (!event) return res.status(404).send({ message: "Event not found! Reload the page." });

        if (event.event_photo) {
            const coverImage_path = path.join(__dirname,'event_profile',event.event_photo);
            fs.unlink(coverImage_path,(err)=>{
                if(err) logger.error(`failed to deleted cover image ${coverImage_path}`, err);
                else logger.info(`Deleted cover image ${coverImage_path}`);
            });
        }

        const photos = await Photo.find({ event_id: _id }).select('name _id');
        await Photo.deleteMany({ event_id: _id });
        // cleanup jobs + faiss
        try { await require('./queue/mongoQueue').Job.deleteMany({ event_id: _id }); } catch(_){}
        try { await axios.post('http://127.0.0.1:5001/faiss_delete_event', { event_id: _id }, { timeout: 5000 }); } catch(e){ logger.info('[faiss] delete_event failed', e.message); }

        photos.forEach((photo) => {
            const photoPath = path.join(__dirname, 'uploads', photo.name);
            fs.unlink(photoPath, (err) => {
                if (err) logger.error(`Failed to delete file: ${photoPath}`, err);
                else logger.info(`Deleted file: ${photoPath}`);
            });
        });

        return res.status(200).send(event);
    } catch (error) {
        logger.error("Error deleting event:", error);
        res.status(500).json({ success: false, message: "Error deleting Event!" });
    }
});


//-----------------------------------------------------------------------------------------------------
const deleteImageHandler = async (req, res) => {
    try {
        const { name, _id } = req.body || {};
        if (!_id) return res.status(400).json({ success: false, message: "Missing image ID" });
        if (!mongoose.Types.ObjectId.isValid(_id)) return res.status(400).json({ success: false, message: "Invalid image ID" });

        const query = name ? { name, _id: new mongoose.Types.ObjectId(_id) } : { _id: new mongoose.Types.ObjectId(_id) };
        const result = await Photo.findOneAndDelete(query);
        if (!result) return res.status(404).json({ success: false, message: "Image not found in database" });

        if (result.event_id) {
            if (result.hash) {
                try { await require('./queue/mongoQueue').Job.deleteOne({ event_id: result.event_id, photo_hash: result.hash }).catch(()=>{}); } catch(_){}
            }
            try { await axios.post('http://127.0.0.1:5001/faiss_remove', { event_id: result.event_id, photo_id: _id }, { timeout: 5000 }).catch(()=>{}); } catch(_){}
        }

        const fileName = result.name || name;
        if (fileName) {
            const imagePath = path.join(__dirname, 'uploads', fileName);
            if (fs.existsSync(imagePath)) {
                try { fs.unlinkSync(imagePath); } catch (err) { logger.warn('[delete-image] unlink error', err); }
            }
        }
        return res.json({ success: true, message: "Image deleted successfully" });
    } catch (error) {
        logger.error('[delete-image]', error);
        res.status(500).json({ success: false, message: "Error deleting image!" });
    }
};

app.delete('/delete-image', deleteImageHandler);
app.delete('/delete-img', deleteImageHandler);

//-----------------------------------------------------------------------------------------------------
app.post("/collect_event", async (req, resp) => {
    try {
        if (!req.body._id || req.body._id.length !== 24) {
            return resp.status(400).send({ message: "Event link is not Correct" });
        }
        
        const { _id } = req.body;
        const objectId = new mongoose.Types.ObjectId(_id);

        // Find the event by its ID
        let event = await Event.findById(objectId);

        if (event) {
            let studio = await Studio.findOne({ create_by: event.created_id });

            event.pin = 1; // Update the pin field
            

            if (studio) {
                resp.status(200).send({ event, studio });
            } else {
                resp.status(200).send({ event });
            }
        } else {
            resp.status(404).send({ message: "Event not found or deleted!" });
        }
    } catch (error) {
        logger.error("Error retrieving events:", error);
        resp.status(500).send({ message: "An error occurred while retrieving events" });
    }
});
//-------------------------------------------------------------------------------------------------------

app.post("/confirm_pin", async (req, resp) => {
    try {
        const { _id, pin } = req.body;
        if (_id) {
            // Convert _id to ObjectId if necessary
            const objectId = new mongoose.Types.ObjectId(_id);

            // Query the database to find the event by _id
            let event = await Event.findById(objectId).select("pin");

            if (event) {
                if (event.pin == pin) {
                    resp.status(200).send({ result: "Pin confirmed", pin: event.pin });
                } else {
                    resp.status(404).send({ result: "Pin is wrong! Contact the photographer to provide the correct (Pin)" });
                }
            } else {
                resp.status(404).send({ result: "Event not found. Please check the Event ID." });
            }
        } else {
            resp.status(400).send({ result: "Event ID is required." });
        }
    } catch (error) {
        logger.error("Server Error:", error);
        // Send a more specific error response to the client
        resp.status(500).send({
            result: "An error occurred on the server!",
            error: error.message // Include the actual error message (for debugging)
        });
    }
});

//-------------------------------------------------------------------------------------------------------

app.post('/studio', async (req, resp) => {
    const { studio_name, phone_no, address, offer, description, create_by } = req.body;

    if (create_by && studio_name && phone_no) {
        try {
            // Check if the record exists
            const existingStudio = await Studio.findOne({create_by:create_by});

            if (existingStudio) {
                // Update existing record
                const updatedStudio = await Studio.findOneAndUpdate(
                    {create_by:create_by},
                    { studio_name, phone_no,address,offer,description },
                    { new: true } // Return the updated document
                );

                if (updatedStudio) {
                    return resp.status(200).send({ message: "Updated your details!", updatedStudio });
                } else {
                    return resp.status(404).send({ message: 'Failed to update your details!' });
                }
            } else {
                // Create a new record
                const studio = new Studio(req.body);
                const result = await studio.save();

                if (result) {
                    return resp.status(200).send({ message: "Saved your details!", studio: result });
                } else {
                    return resp.status(404).send({ message: 'Failed to save your details!' });
                }
            }
        } catch (error) {
            if (error.code === 11000 && error.keyPattern?.create_by) {
                resp.status(400).send({ message: 'Studio detail already exists' });
            } else {
                
                resp.status(500).send({ message: 'An unexpected error occurred' });
            }
        }
    } else {
        return resp.status(400).send({ message: "Studio name, Phone No, and Created By are required" });
    }
});

//-----------------------------------------------------------------------------------------------------
app.get('/exist-studio', async (req, res) => {
    try {
        const { create_by } = req.query; // Use query for GET request parameters

        if (create_by) {
            const exist = await Studio.findOne({ create_by });

            if (exist) {
                return res.status(200).send({ message: 'Detail is available', exist });
            } else {
                return res.status(404).send({ message: "Detail not present", });
            }
        } else {
            return res.status(400).send({ message: "create_by parameter is required" });
        }
    } catch (error) {
        logger.error(error);
        return res.status(500).send({ message: 'An unexpected error occurred' });
    }
});


//-------------------------------------------------------------------------------------------------------

// Send OTP route
app.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    // delete otpStorage[email];

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    } else {
        let check = await User.findOne({ email: email })
        if (check) {
            try {
                const otp = generateOTP();
                otpStorage[email] = otp; // Store OTP against email
        
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Your OTP Code',
                    text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
                };
        
                await transporter.sendMail(mailOptions);
                res.status(200).json({ message: `OTP sent ${email} successfully!` });
            } catch (error) {
                logger.error('Error sending email:', error);
                res.status(500).json({ message: 'Failed to send OTP' });
            }
            
        } else{
            return res.status(404).send({ message: `${email} is not Register!` })

        }
    }


   
});


//-------------------------------------------------------------------------------------------------------

// Verify OTP route
app.post('/newPassword-verify-otp', async (req, res) => {
    const { email, otp, newpassword } = req.body;
    if (!email || !otp || !newpassword) {
        return res.status(400).send({ message: 'All Inputs are required!!!' })
    }

    if (otpStorage[email] === otp) {
        delete otpStorage[email]; // Remove OTP after verification
        let update = await User.updateOne(
            { email: email },
            { $set: { password: newpassword } })
        if(update){
        res.status(200).json({ message: 'Your Password is successfully Change!' });
        }else{
            res.status(404).send({message:"User is not available or Server error"})
        }

    } else {
        res.status(400).json({ message: `Invalid OTP or Expire! Regenrate OTP against ${email}` });
    }
});


//----------------------------------------------------------------------------------------------------

app.put("/events/:id", async (req, res) => {
    const { id } = req.params; // Extract event ID from URL params
    const { updateName, updatePin } = req.body; // Extract fields to update from request body
    const event_name = updateName
    const pin = updatePin
    try {
        // Validate inputs
        if (!event_name && !pin) {
            return res.status(400).json({ message: "Not Provide event_name or pin to update." });
        }

        // Update the event
        const updatedEvent = await Event.findByIdAndUpdate(
            id,
            { $set: { event_name, pin } },
            { new: true, runValidators: true } // Return the updated document and run schema validators
        );

        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found." });
        }

        // Success response
        res.status(200).json({ message: "Event updated successfully.", updatedEvent });
    } catch (error) {
        logger.error("Error updating event:", error);
        res.status(500).json({ message: "Internal server error.", error: error.message });
    }
});


//-------------------------------------------------------------------------------------------------------




// P2: Prometheus metrics (no auth needed, scrape interval 15s)
app.get('/metrics', async (req,res)=>{
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch(e){ logger.error('Metrics failed', { error: e.message, stack: e.stack }); res.status(500).send(String(e.message)); }
});
// P2: queue stats per event + DLQ helpers
app.get('/queue/stats', async (req,res)=>{
  const { event_id } = req.query;
  if(!event_id) return res.status(400).send({error:'event_id required'});
  if(!mongoose.Types.ObjectId.isValid(event_id)) return res.status(400).send({error:'invalid event_id'});
  try { res.send(await queueStats(event_id)); } catch(e){ logger.error('Queue stats failed', { error: e.message, stack: e.stack, event_id }); res.status(500).send({error:e.message}); }
});
app.get('/queue/failed', async (req,res)=>{
  const { event_id, limit } = req.query;
  if(!event_id) return res.status(400).send({error:'event_id required'});
  if(!mongoose.Types.ObjectId.isValid(event_id)) return res.status(400).send({error:'invalid event_id'});
  let lim = parseInt(limit,10);
  if (Number.isNaN(lim) || lim <=0) lim = 20;
  lim = Math.min(Math.max(lim,1),100);
  try {
    const q = require('./queue/mongoQueue');
    res.send(await q.listFailed(event_id, lim));
  } catch(e){ logger.error('Queue failed list', { error: e.message, stack: e.stack, event_id }); res.status(500).send({error:e.message}); }
});
app.post('/queue/retry', async (req,res)=>{
  const { event_id, photo_hash } = req.body;
  if(!event_id) return res.status(400).send({error:'event_id required'});
  if(!mongoose.Types.ObjectId.isValid(event_id)) return res.status(400).send({error:'invalid event_id'});
  if (photo_hash && (typeof photo_hash !== 'string' || photo_hash.length !== 64)) return res.status(400).send({error:'invalid photo_hash (expect sha256 hex)'});
  try {
    const q = require('./queue/mongoQueue');
    const r = await q.retryFailed(event_id, photo_hash);
    res.send({ ok:true, modified: r.modifiedCount || r.matchedCount || 0 });
  } catch(e){ logger.error('Queue retry failed', { error: e.message, stack: e.stack, event_id }); res.status(500).send({error:e.message}); }
});
// P2: R2 presigned PUT (falls back to local if no R2 env) – validated key, contentType allowlist
app.post('/presign', async (req,res)=>{
  const { key, contentType } = req.body;
  if(!key || typeof key !== 'string') return res.status(400).send({error:'key required'});
  if (key.includes('..') || key.startsWith('/') || key.length > 512) return res.status(400).send({error:'invalid key'});
  const ct = contentType || 'image/jpeg';
  const allowedCT = ['image/jpeg','image/png','image/webp','image/gif','image/bmp'];
  if (!allowedCT.includes(ct)) return res.status(400).send({error:'unsupported contentType'});
  try {
    const url = await getPresignedPut(key, ct);
    if(url) return res.send({ url, via:'r2', expiresIn: 3600 });
    res.send({ url: null, via:'local', message:'R2 not configured, use local upload' });
  } catch(e){ logger.error('Presign failed', { error: e.message, stack: e.stack, key }); res.status(500).send({error:e.message}); }
});

// Global error logging — main error log is logs/error.log
app.use((err, req, res, next) => {
  logger.error('Unhandled Express error', { error: err.message, stack: err.stack, method: req.method, route: req.path });
  res.status(500).send({ message: 'Internal server error' });
});
process.on('uncaughtException', (err) => logger.error('uncaughtException', { error: err.message, stack: err.stack }));
process.on('unhandledRejection', (reason) => logger.error('unhandledRejection', { error: String(reason), stack: reason?.stack }));

app.listen(5000)
logger.info("server is running on port 5000")
// app.listen(5000, () => {
//     logger.info("Server is running on port 5000");
// });
